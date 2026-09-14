import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import {
  getNewsletterDueSubscribers,
  getSubscriberByEmail,
  recordEmailSend,
  insertNewsletterSchedule,
  getScheduleForNewsletter,
  updateNewsletterIssueLiquidMap,
  getNewsletterPublication,
  getNewsletterEngagementBatch,
  getNewsletterSegmentsForIssue,
  advanceNewsletterSegments,
} from '@/lib/db';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import { loadNewsletterIssue } from '@/newsletters/loader';
import {
  hasLiquidConditionals,
  hasLiquidOutputTags,
  extractDynamicSections,
  buildDynamicContactProperties,
  computeDerivedPropertyValues,
} from '@/newsletters/resolve';
import {
  renderNewsletterForBroadcast,
  renderNewsletterForBroadcastWithHtml,
  syncContactProperties,
} from '@/lib/resend-broadcasts';
import { getResendClient, createPropertyIfMissing, deleteNewsletterProperties } from '@/lib/resend-contacts';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import type { EngagementData } from '@/newsletters/resolve';
import type { ScheduleEvent, ScheduleStepId } from '@/lib/types/schedule-progress';

/**
 * POST /api/admin/newsletters/schedule
 *
 * Schedule a newsletter for broadcast delivery at the next cadence date.
 * Returns an NDJSON stream with real-time progress events.
 *
 * Body: { newsletterNumber: number, sendAt?: string, test?: boolean }
 *
 * When `test: true`, the broadcast is sent immediately to the admin
 * subscriber only (via ADMIN_EMAIL env var). No DB side-effects occur
 * (no recordEmailSend, insertNewsletterSchedule, or advanceNewsletterSegments).
 *
 * Pre-stream validation errors (auth, input, already-scheduled) return
 * standard JSON responses. Once validation passes, the response switches
 * to streaming NDJSON.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { newsletterNumber?: number; sendAt?: string; test?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { newsletterNumber, sendAt } = body;
  const isTest = !!body.test;

  if (typeof newsletterNumber !== 'number' || newsletterNumber < 1) {
    return NextResponse.json({ error: 'Invalid newsletterNumber' }, { status: 400 });
  }

  // Test mode: validate ADMIN_EMAIL is configured
  if (isTest) {
    if (!process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'ADMIN_EMAIL environment variable is not configured' },
        { status: 400 },
      );
    }
  }

  // Use provided sendAt if present, otherwise fall back to the publication's next_send_at
  // Test mode skips scheduling entirely (sends immediately)
  let scheduledDate: Date | null = null;
  if (!isTest) {
    if (sendAt) {
      scheduledDate = new Date(sendAt);
    } else {
      const publication = await getNewsletterPublication(1);
      if (publication?.nextSendAt) {
        scheduledDate = new Date(publication.nextSendAt);
      } else {
        return NextResponse.json(
          { error: 'No sendAt provided and no next_send_at configured in publication settings' },
          { status: 400 },
        );
      }
    }

    // Check if already scheduled
    const existingSchedule = await getScheduleForNewsletter(newsletterNumber);
    if (existingSchedule && existingSchedule.status === 'scheduled') {
      return NextResponse.json(
        { error: `Newsletter #${newsletterNumber} is already scheduled (broadcast ${existingSchedule.broadcast_id})` },
        { status: 409 },
      );
    }
  }

  // --- Validation passed — switch to streaming NDJSON ---

  const encoder = new TextEncoder();
  let currentStep: ScheduleStepId | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: ScheduleEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      }

      try {
        // Step 1: Load newsletter content
        currentStep = 'load';
        emit({ step: 'load', status: 'start', label: 'Loading newsletter content' });
        const raw = await loadNewsletterIssue(newsletterNumber);
        if (!raw) {
          throw new Error(`Newsletter #${newsletterNumber} not found`);
        }
        emit({ step: 'load', status: 'done', label: 'Loading newsletter content', detail: `#${newsletterNumber}` });

        // Step 2: Get due subscribers (test mode: admin subscriber only)
        currentStep = 'subscribers';
        emit({ step: 'subscribers', status: 'start', label: isTest ? 'Finding admin subscriber' : 'Finding subscribers' });

        let subscribers: Awaited<ReturnType<typeof getNewsletterDueSubscribers>>;
        if (isTest) {
          const adminSub = await getSubscriberByEmail(process.env.ADMIN_EMAIL!);
          if (!adminSub) {
            throw new Error(`Admin subscriber not found: ${process.env.ADMIN_EMAIL}`);
          }
          if (!adminSub.chart) {
            throw new Error(`Admin subscriber has no chart data: ${process.env.ADMIN_EMAIL}`);
          }
          subscribers = [adminSub];
          emit({ step: 'subscribers', status: 'done', label: 'Finding admin subscriber', detail: adminSub.email });
        } else {
          const allDue = await getNewsletterDueSubscribers(WELCOME_SERIES_LENGTH);
          subscribers = allDue.filter(s => s.next_step === newsletterNumber);
          if (subscribers.length === 0) {
            throw new Error('No subscribers are due for this newsletter');
          }
          emit({ step: 'subscribers', status: 'done', label: 'Finding subscribers', detail: `Found ${subscribers.length}` });
        }

        // Step 3: Template rendering (Liquid path or standard)
        currentStep = 'templates';
        const client = getResendClient();
        const hasLiquid = hasLiquidConditionals(raw.bodyHtml) || hasLiquidOutputTags(raw.bodyHtml);

        let html: string;
        let subject: string;

        if (hasLiquid) {
          emit({ step: 'templates', status: 'start', label: 'Rendering personalized templates' });

          const storedMap = raw.liquidSectionMap;
          const { broadcastTemplate, sections, derivedProperties, sectionMap: newMap } = extractDynamicSections(
            raw.bodyHtml,
            newsletterNumber,
            raw.newsletterId,
            storedMap,
          );

          // Compute removed keys: keys in old map but not in new map
          const oldKeys = new Set(storedMap?.keys ?? []);
          const newKeys = new Set(newMap.keys);
          const removedKeys = [...oldKeys].filter(k => !newKeys.has(k));

          if (removedKeys.length > 0) {
            console.log(`[schedule] Cleaning up ${removedKeys.length} removed section properties: ${removedKeys.join(', ')}`);
            await deleteNewsletterProperties(removedKeys);
          }

          // Ensure dynamic section contact properties exist in Resend
          for (const section of sections) {
            await createPropertyIfMissing(section.propertyKey);
          }

          // Ensure derived property keys exist in Resend
          for (const dp of derivedProperties) {
            await createPropertyIfMissing(dp.propertyKey);
          }

          // Batch-load newsletter engagement for all subscribers
          const engagementBySubscriber = await getNewsletterEngagementBatch(
            subscribers.map(s => s.id),
          );

          // Render dynamic sections and compute derived properties for each subscriber
          for (let i = 0; i < subscribers.length; i++) {
            const subscriber = subscribers[i];
            emit({
              step: 'templates',
              status: 'progress',
              label: 'Rendering personalized templates',
              current: i + 1,
              total: subscribers.length,
            });

            if (!subscriber.chart?.chart) {
              console.warn(
                `[schedule] Subscriber ${subscriber.email} has no chart data, skipping Liquid rendering`,
              );
              continue;
            }
            const chart = parseChartForEmail(subscriber.chart.chart);
            const engagement: EngagementData = {
              newsletters: engagementBySubscriber.get(subscriber.id) ?? new Map(),
            };
            const dynamicProps = await buildDynamicContactProperties(
              raw.bodyHtml,
              chart,
              newsletterNumber,
              raw.newsletterId,
              storedMap,
              engagement,
            );

            // Compute derived property values (from Liquid filters like capitalize)
            const derivedProps = await computeDerivedPropertyValues(
              derivedProperties,
              chart,
              subscriber.first_name,
              subscriber.last_name ?? undefined,
              subscriber.email,
            );

            const allProps = { ...dynamicProps, ...derivedProps };

            if (Object.keys(allProps).length > 0) {
              const { error } = await client.contacts.update({
                email: subscriber.email,
                properties: allProps,
              });
              if (error) {
                console.warn(
                  `[schedule] Failed to sync dynamic properties for ${subscriber.email}:`,
                  error,
                );
              }
            }
          }

          emit({ step: 'templates', status: 'done', label: 'Rendering personalized templates', detail: `${subscribers.length} rendered` });

          // Step 3b: Save liquid map + render broadcast HTML
          currentStep = 'render-broadcast';
          emit({ step: 'render-broadcast', status: 'start', label: 'Rendering broadcast' });

          await updateNewsletterIssueLiquidMap(newsletterNumber, newMap);

          const rendered = await renderNewsletterForBroadcastWithHtml(
            newsletterNumber,
            broadcastTemplate,
          );
          html = rendered.html;
          subject = rendered.subject;

          emit({ step: 'render-broadcast', status: 'done', label: 'Rendering broadcast' });
        } else {
          emit({ step: 'templates', status: 'start', label: 'Rendering template' });
          emit({ step: 'templates', status: 'done', label: 'Rendering template', detail: 'No personalization needed' });

          currentStep = 'render-broadcast';
          emit({ step: 'render-broadcast', status: 'start', label: 'Rendering broadcast' });
          const rendered = await renderNewsletterForBroadcast(newsletterNumber);
          html = rendered.html;
          subject = rendered.subject;
          emit({ step: 'render-broadcast', status: 'done', label: 'Rendering broadcast' });
        }

        // Step 4: Sync contact properties
        currentStep = 'contact-properties';
        emit({ step: 'contact-properties', status: 'start', label: 'Syncing contact properties' });
        await syncContactProperties(subscribers, (current, total) => {
          emit({
            step: 'contact-properties',
            status: 'progress',
            label: 'Syncing contact properties',
            current,
            total,
          });
        });
        emit({ step: 'contact-properties', status: 'done', label: 'Syncing contact properties' });

        // Step 5: Check for persistent audience segments, or create ephemeral one
        currentStep = 'segment';
        const matchingSegments = await getNewsletterSegmentsForIssue(1, newsletterNumber);

        let segmentId: string;
        let contactCount: number;

        if (matchingSegments.length > 0) {
          // Use existing persistent segment(s)
          if (matchingSegments.length === 1) {
            // Single segment — use it directly
            segmentId = matchingSegments[0].resendSegmentId;
            contactCount = subscribers.length;
            emit({ step: 'segment', status: 'start', label: 'Using segment' });
            emit({ step: 'segment', status: 'done', label: 'Using segment', detail: matchingSegments[0].name });
          } else {
            // Multiple segments — create ephemeral merged segment
            emit({ step: 'segment', status: 'start', label: 'Merging segments' });
            const mergedName = `newsletter_${newsletterNumber}_merged_${Date.now()}`;
            const { data: mergedData, error: mergedError } = await client.segments.create({
              name: mergedName,
            });
            if (mergedError || !mergedData) {
              throw new Error(`Failed to create merged segment: ${JSON.stringify(mergedError)}`);
            }
            segmentId = mergedData.id;

            // Add all contacts from each audience segment
            const addedEmails = new Set<string>();
            for (const seg of matchingSegments) {
              for (const subscriber of subscribers) {
                if (addedEmails.has(subscriber.email)) continue;
                const { error } = await client.contacts.segments.add({
                  email: subscriber.email,
                  segmentId,
                });
                if (!error) {
                  addedEmails.add(subscriber.email);
                }
              }
            }
            contactCount = addedEmails.size;
            emit({
              step: 'segment',
              status: 'done',
              label: 'Merging segments',
              detail: `${matchingSegments.length} segments, ${contactCount} contacts`,
            });
          }

          // Skip individual contact adding — already in segment
          currentStep = 'segment-contacts';
          emit({ step: 'segment-contacts', status: 'start', label: 'Contacts already in segment' });
          emit({ step: 'segment-contacts', status: 'done', label: 'Contacts already in segment', detail: `${contactCount} contacts` });
        } else {
          // No persistent segments — ephemeral flow
          emit({ step: 'segment', status: 'start', label: 'Creating segment' });

          const { data: segListData } = await client.segments.list();
          if (segListData?.data) {
            for (const seg of segListData.data) {
              if (seg.name.startsWith('newsletter_') || seg.name.startsWith('broadcast_')) {
                await client.segments.remove(seg.id).catch(() => {
                  // Don't let cleanup failures block the send
                });
              }
            }
          }

          const segmentName = `newsletter_${newsletterNumber}_scheduled_${Date.now()}`;
          const { data: segmentData, error: segmentError } = await client.segments.create({
            name: segmentName,
          });
          if (segmentError || !segmentData) {
            throw new Error(`Failed to create segment: ${JSON.stringify(segmentError)}`);
          }
          segmentId = segmentData.id;
          emit({ step: 'segment', status: 'done', label: 'Creating segment', detail: segmentName });

          // Step 6: Add subscribers to segment
          currentStep = 'segment-contacts';
          emit({ step: 'segment-contacts', status: 'start', label: 'Adding contacts to segment' });
          contactCount = 0;
          for (let i = 0; i < subscribers.length; i++) {
            const subscriber = subscribers[i];
            emit({
              step: 'segment-contacts',
              status: 'progress',
              label: 'Adding contacts to segment',
              current: i + 1,
              total: subscribers.length,
            });
            const { error } = await client.contacts.segments.add({
              email: subscriber.email,
              segmentId,
            });
            if (error) {
              console.warn(`[schedule] Failed to add ${subscriber.email} to segment:`, error);
              continue;
            }
            contactCount++;
          }

          if (contactCount === 0) {
            throw new Error('No contacts could be added to segment');
          }
          emit({ step: 'segment-contacts', status: 'done', label: 'Adding contacts to segment', detail: `${contactCount} added` });
        }

        // Step 7: Create broadcast
        currentStep = 'broadcast';
        emit({ step: 'broadcast', status: 'start', label: 'Creating broadcast' });

        const broadcastDomain = process.env.EMAIL_DOMAIN_BROADCAST;
        const from = broadcastDomain
          ? `Shawn Lauzon <shawn@${broadcastDomain}>`
          : process.env.EMAIL_FROM_MARKETING ?? 'Shawn Lauzon <updates@livecorrectly.com>';
        const replyTo = broadcastDomain
          ? undefined
          : process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';

        const { data: broadcastData, error: broadcastError } = await client.broadcasts.create({
          name: isTest ? `[TEST] Newsletter #${newsletterNumber}` : `Newsletter #${newsletterNumber}`,
          segmentId,
          from,
          replyTo,
          subject,
          html,
          send: true,
          ...(scheduledDate && { scheduledAt: scheduledDate.toISOString() }),
        });

        if (broadcastError || !broadcastData) {
          throw new Error(`Failed to create broadcast: ${JSON.stringify(broadcastError)}`);
        }

        const broadcastId = broadcastData.id;
        emit({ step: 'broadcast', status: 'done', label: 'Creating broadcast', detail: broadcastId });

        // Step 8: Record in DB (skipped in test mode)
        currentStep = 'records';
        if (isTest) {
          emit({ step: 'records', status: 'start', label: 'Recording schedule' });
          emit({ step: 'records', status: 'done', label: 'Recording schedule', detail: 'Skipped (test)' });

          console.log(
            `[schedule] TEST: Newsletter #${newsletterNumber} sent as broadcast ${broadcastId} to ${process.env.ADMIN_EMAIL}, ${contactCount} contacts`,
          );

          emit({
            step: 'complete',
            result: {
              scheduleId: 0,
              broadcastId,
              segmentId,
              contactCount,
              scheduledAt: new Date().toISOString(),
            },
          });
        } else {
          emit({ step: 'records', status: 'start', label: 'Recording schedule' });

          for (const subscriber of subscribers) {
            await recordEmailSend({
              subscriberId: subscriber.id,
              emailType: `newsletter_${newsletterNumber}`,
              category: 'newsletter',
              resendBroadcastId: broadcastId,
            });
          }

          const schedule = await insertNewsletterSchedule({
            newsletterNum: newsletterNumber,
            broadcastId,
            segmentId,
            scheduledAt: scheduledDate!,
            subscriberCount: contactCount,
          });

          // Advance persistent segments that were used for this issue
          if (matchingSegments.length > 0) {
            await advanceNewsletterSegments(matchingSegments.map(s => s.id));
            console.log(
              `[schedule] Advanced ${matchingSegments.length} segment(s): ${matchingSegments.map(s => s.name).join(', ')}`,
            );
          }

          emit({ step: 'records', status: 'done', label: 'Recording schedule' });

          console.log(
            `[schedule] Newsletter #${newsletterNumber} scheduled as broadcast ${broadcastId} for ${scheduledDate!.toISOString()}, ${contactCount} contacts`,
          );

          emit({
            step: 'complete',
            result: {
              scheduleId: schedule.id,
              broadcastId,
              segmentId,
              contactCount,
              scheduledAt: scheduledDate!.toISOString(),
            },
          });
        }
      } catch (error) {
        console.error('[admin/newsletters/schedule] Error:', error);
        emit({
          step: 'error',
          error: error instanceof Error ? error.message : 'Internal server error',
          failedStep: currentStep,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  });
}
