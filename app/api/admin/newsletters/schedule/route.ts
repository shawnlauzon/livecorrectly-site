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
  insertNewsletterSegment,
} from '@/lib/db';
import type { Subscriber } from '@/lib/types/subscriber';
import { WELCOME_SERIES_LENGTH } from '@/lib/email/welcome';
import { loadNewsletterIssue } from '@/lib/newsletter/loader';
import {
  hasLiquidConditionals,
  hasLiquidOutputTags,
  extractDynamicSections,
  buildDynamicContactProperties,
  computeDerivedPropertyValues,
} from '@/lib/newsletter/resolve';
import {
  renderNewsletterForBroadcast,
  renderNewsletterForBroadcastWithHtml,
  syncContactProperties,
  getBroadcastSender,
} from '@/lib/resend/broadcasts';
import { getResendClient, createPropertyIfMissing, deleteNewsletterProperties } from '@/lib/resend/contacts';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { nextRegularSendAt, zonedDateString } from '@/lib/newsletter/cadence';
import { getNoteForSend } from '@/lib/newsletter/notes';
import { planAudience, autoSegmentName } from '@/lib/newsletter/audience';
import type { AudiencePlan } from '@/lib/newsletter/audience';
import { addEmailsToSegment, removeNewsletterSegment } from '@/lib/newsletter/segments';
import { getNewsletterIssue } from '@/lib/newsletter/email-loader';
import { renderNewsletterEmail } from '@/lib/newsletter/email-template';
import { buildUnsubscribeUrl, formatEmailRecipient, sendNewsletterEmail } from '@/lib/email/send';
import type { EngagementData } from '@/lib/newsletter/resolve';
import type { ScheduleEvent, ScheduleStepId } from '@/lib/types/schedule-progress';

/** Test sends go to this subscriber unless NEWSLETTER_TEST_EMAIL is set. */
const DEFAULT_NEWSLETTER_TEST_EMAIL = 'shawn.lauzon@gmail.com';

/**
 * POST /api/admin/newsletters/schedule
 *
 * Schedule a newsletter issue for the regular cadence time (or `sendAt`).
 * Returns an NDJSON stream with real-time progress events.
 *
 * Body: { newsletterNumber: number, sendAt?: string, test?: boolean, confirmMerge?: boolean }
 *
 * If a note is dated on the send day (publication timezone), it's rendered
 * above the issue body. Test sends use the next regular send day's note, so
 * they show what the real send would look like.
 *
 * The audience is the active subscribers whose next_step is this issue, reached
 * per planAudience(): an existing segment (stragglers are added to it), several
 * segments merged into the oldest (requires `confirmMerge: true`, otherwise 409
 * with `needsMergeConfirmation`), a new persistent date-named segment, or — for
 * small cohorts — individual scheduled emails with no segment.
 *
 * Completion (status → sent, segment → next issue) happens later in
 * finalizeDueSchedules(), once Resend reports the send done.
 *
 * When `test: true`, the broadcast is sent immediately to the test subscriber
 * only (NEWSLETTER_TEST_EMAIL, defaulting to DEFAULT_NEWSLETTER_TEST_EMAIL).
 * No DB side-effects occur.
 *
 * Pre-stream validation errors (auth, input, already-scheduled, merge
 * confirmation) return standard JSON responses. Once validation passes, the
 * response switches to streaming NDJSON.
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

  let body: {
    newsletterNumber?: number;
    sendAt?: string;
    test?: boolean;
    confirmMerge?: boolean;
  };
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

  // Test mode: the recipient must be a subscriber with a chart, since the
  // issue is personalized from their row
  let testEmail: string | undefined;
  if (isTest) {
    const rawTestEmail = process.env.NEWSLETTER_TEST_EMAIL || DEFAULT_NEWSLETTER_TEST_EMAIL;
    // Handle both "Name <email>" and bare "email" formats
    const match = rawTestEmail.match(/<([^>]+)>/);
    testEmail = match ? match[1] : rawTestEmail.trim();
  }

  const publication = await getNewsletterPublication(1);

  // Use provided sendAt if present, otherwise the next regular cadence time
  // Test mode skips scheduling entirely (sends immediately)
  let scheduledDate: Date | null = null;
  let timezone = 'America/Chicago';
  let dueSubscribers: Subscriber[] = [];
  let plan: AudiencePlan | null = null;
  if (!isTest) {
    if (publication) timezone = publication.timezone;
    if (sendAt) {
      scheduledDate = new Date(sendAt);
    } else {
      scheduledDate = publication ? nextRegularSendAt(publication) : null;
      if (!scheduledDate) {
        return NextResponse.json(
          { error: 'No sendAt provided and no weekly send day/time configured in publication settings' },
          { status: 400 },
        );
      }
    }

    // Check if already scheduled
    const existingSchedule = await getScheduleForNewsletter(newsletterNumber);
    if (existingSchedule && existingSchedule.status === 'scheduled') {
      return NextResponse.json(
        { error: `Newsletter #${newsletterNumber} is already scheduled` },
        { status: 409 },
      );
    }

    const allDue = await getNewsletterDueSubscribers(WELCOME_SERIES_LENGTH);
    dueSubscribers = allDue.filter(s => s.next_step === newsletterNumber);
    if (dueSubscribers.length === 0) {
      return NextResponse.json(
        { error: 'No subscribers are due for this newsletter' },
        { status: 422 },
      );
    }

    plan = planAudience({
      dueCount: dueSubscribers.length,
      segmentsAtIssue: await getNewsletterSegmentsForIssue(1, newsletterNumber),
    });
    if (plan.kind === 'merge' && !body.confirmMerge) {
      return NextResponse.json(
        {
          error: 'Multiple segments are on this issue and must be merged',
          needsMergeConfirmation: true,
          keep: plan.keep.name,
          merge: plan.remove.map(s => s.name),
        },
        { status: 409 },
      );
    }
  }

  // The note for the send day is rendered into the HTML now, so the send keeps
  // the note as it was at schedule time
  const noteDay = isTest
    ? (publication ? nextRegularSendAt(publication) : null)
    : scheduledDate;
  const note = noteDay
    ? (await getNoteForSend(1, noteDay, publication?.timezone ?? timezone))?.body
    : undefined;

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

        // Step 2: Get due subscribers (test mode: test subscriber only)
        currentStep = 'subscribers';
        emit({ step: 'subscribers', status: 'start', label: isTest ? 'Finding test subscriber' : 'Finding subscribers' });

        let subscribers: Subscriber[];
        if (isTest) {
          const testSub = await getSubscriberByEmail(testEmail!);
          if (!testSub) {
            throw new Error(`Test subscriber not found: ${testEmail}`);
          }
          if (!testSub.chart) {
            throw new Error(`Test subscriber has no chart data: ${testEmail}`);
          }
          subscribers = [testSub];
          emit({ step: 'subscribers', status: 'done', label: 'Finding test subscriber', detail: testSub.email });
        } else {
          subscribers = dueSubscribers;
          emit({ step: 'subscribers', status: 'done', label: 'Finding subscribers', detail: `Found ${subscribers.length}` });
        }

        if (plan?.kind === 'direct') {
          await scheduleDirectSends(emit, (step) => { currentStep = step; }, {
            newsletterNumber,
            subscribers,
            scheduledDate: scheduledDate!,
            note,
          });
          return;
        }

        // Step 3: Sync contact properties — runs before template rendering
        // so that contacts exist before the Liquid step merges per-subscriber
        // dynamic section values via contacts.update()
        currentStep = 'contact-properties';
        const client = getResendClient();
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

        // Step 4: Template rendering (Liquid path or standard)
        currentStep = 'templates';
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
            { note },
          );
          html = rendered.html;
          subject = rendered.subject;

          emit({ step: 'render-broadcast', status: 'done', label: 'Rendering broadcast', ...(note && { detail: 'Note included' }) });
        } else {
          emit({ step: 'templates', status: 'start', label: 'Rendering template' });
          emit({ step: 'templates', status: 'done', label: 'Rendering template', detail: 'No personalization needed' });

          currentStep = 'render-broadcast';
          emit({ step: 'render-broadcast', status: 'start', label: 'Rendering broadcast' });
          const rendered = await renderNewsletterForBroadcast(newsletterNumber, { note });
          html = rendered.html;
          subject = rendered.subject;
          emit({ step: 'render-broadcast', status: 'done', label: 'Rendering broadcast', ...(note && { detail: 'Note included' }) });
        }

        // Step 5: Resolve the audience segment.
        // Test mode always uses an ephemeral segment with only the test subscriber —
        // a persistent segment would send the broadcast to ALL its contacts.
        currentStep = 'segment';
        let segmentId: string;
        let newsletterSegmentId: number | null = null;

        if (isTest) {
          emit({ step: 'segment', status: 'start', label: 'Creating test segment' });
          await removeEphemeralSegments();
          const segmentName = `newsletter_${newsletterNumber}_test_${Date.now()}`;
          const { data: segmentData, error: segmentError } = await client.segments.create({ name: segmentName });
          if (segmentError || !segmentData) {
            throw new Error(`Failed to create segment: ${JSON.stringify(segmentError)}`);
          }
          segmentId = segmentData.id;
          emit({ step: 'segment', status: 'done', label: 'Creating test segment', detail: segmentName });
        } else if (plan!.kind === 'merge') {
          segmentId = plan!.keep.resendSegmentId;
          newsletterSegmentId = plan!.keep.id;
          emit({ step: 'segment', status: 'start', label: 'Merging segments' });
          emit({
            step: 'segment',
            status: 'done',
            label: 'Merging segments',
            detail: `${plan!.remove.map(s => s.name).join(', ')} → ${plan!.keep.name}`,
          });
        } else if (plan!.kind === 'segment') {
          segmentId = plan!.segment.resendSegmentId;
          newsletterSegmentId = plan!.segment.id;
          emit({ step: 'segment', status: 'start', label: 'Using segment' });
          emit({ step: 'segment', status: 'done', label: 'Using segment', detail: plan!.segment.name });
        } else {
          // new-segment: persistent, so it becomes this cohort's "Next" segment
          const name = autoSegmentName(zonedDateString(scheduledDate!, timezone), newsletterNumber);
          emit({ step: 'segment', status: 'start', label: 'Creating segment' });
          const { data: segmentData, error: segmentError } = await client.segments.create({
            name: `segment_${name}`,
          });
          if (segmentError || !segmentData) {
            throw new Error(`Failed to create segment: ${JSON.stringify(segmentError)}`);
          }
          segmentId = segmentData.id;
          const saved = await insertNewsletterSegment({
            newsletterId: 1,
            name,
            resendSegmentId: segmentData.id,
            nextIssue: newsletterNumber,
          });
          newsletterSegmentId = saved.id;
          emit({ step: 'segment', status: 'done', label: 'Creating segment', detail: name });
        }

        // Step 6: Add the due subscribers to the segment. For an existing
        // segment this adds stragglers who aren't in it yet.
        currentStep = 'segment-contacts';
        emit({ step: 'segment-contacts', status: 'start', label: 'Adding contacts to segment' });
        const contactCount = await addEmailsToSegment(
          segmentId,
          subscribers.map(s => s.email),
          (current, total) => emit({
            step: 'segment-contacts',
            status: 'progress',
            label: 'Adding contacts to segment',
            current,
            total,
          }),
        );
        if (contactCount === 0) {
          throw new Error('No contacts could be added to segment');
        }
        emit({ step: 'segment-contacts', status: 'done', label: 'Adding contacts to segment', detail: `${contactCount} added` });

        // Merge: the kept segment now holds everyone, so drop the others
        if (!isTest && plan!.kind === 'merge') {
          for (const seg of plan!.remove) {
            await removeNewsletterSegment(seg);
          }
        }

        // Step 7: Create broadcast
        currentStep = 'broadcast';
        emit({ step: 'broadcast', status: 'start', label: 'Creating broadcast' });

        const { from, replyTo } = getBroadcastSender();

        const { data: broadcastData, error: broadcastError } = await client.broadcasts.create({
          name: `${isTest ? '[TEST] ' : ''}Newsletter #${newsletterNumber} — ${(scheduledDate ?? new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
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
            `[schedule] TEST: Newsletter #${newsletterNumber} sent as broadcast ${broadcastId} to ${testEmail},${contactCount} contacts`,
          );

          emit({
            step: 'complete',
            result: {
              scheduleId: 0,
              kind: 'broadcast',
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
            kind: 'broadcast',
            broadcastId,
            segmentId,
            newsletterSegmentId,
            resendEmailIds: null,
            scheduledAt: scheduledDate!,
            subscriberCount: contactCount,
          });

          emit({ step: 'records', status: 'done', label: 'Recording schedule' });

          console.log(
            `[schedule] Newsletter #${newsletterNumber} scheduled as broadcast ${broadcastId} for ${scheduledDate!.toISOString()}, ${contactCount} contacts`,
          );

          emit({
            step: 'complete',
            result: {
              scheduleId: schedule.id,
              kind: 'broadcast',
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

/**
 * Delete leftover ephemeral test segments (newsletter_* / broadcast_*) so test
 * sends stay within Resend's segment limit. Persistent segments use segment_*.
 */
async function removeEphemeralSegments(): Promise<void> {
  const client = getResendClient();
  const { data, error } = await client.segments.list();
  if (error || !data) {
    console.warn('[schedule] Failed to list segments for cleanup:', error);
    return;
  }
  for (const seg of data.data) {
    if (seg.name.startsWith('newsletter_') || seg.name.startsWith('broadcast_')) {
      const { error: removeError } = await client.segments.remove(seg.id);
      if (removeError) {
        // Cleanup is best-effort; a leftover test segment doesn't affect the send
        console.warn(`[schedule] Failed to remove ephemeral segment ${seg.id}:`, removeError);
      }
    }
  }
}

/**
 * Small cohort path: render the issue for each subscriber and schedule it as an
 * individual email at the send time. No segment or broadcast is involved; the
 * subscribers are found again by next_step for the following issue.
 */
async function scheduleDirectSends(
  emit: (event: ScheduleEvent) => void,
  setStep: (step: ScheduleStepId) => void,
  opts: { newsletterNumber: number; subscribers: Subscriber[]; scheduledDate: Date; note?: string },
): Promise<void> {
  const { newsletterNumber, subscribers, scheduledDate, note } = opts;
  const emailLabel = `newsletter_${newsletterNumber}`;

  for (const [step, label] of [
    ['contact-properties', 'Syncing contact properties'],
    ['render-broadcast', 'Rendering broadcast'],
    ['segment', 'Creating segment'],
    ['segment-contacts', 'Adding contacts to segment'],
  ] as const) {
    emit({ step, status: 'done', label, detail: `Not needed (${subscribers.length} direct)` });
  }

  setStep('templates');
  emit({ step: 'templates', status: 'start', label: 'Rendering personalized emails' });
  const rendered: { subscriber: Subscriber; subject: string; html: string }[] = [];
  for (let i = 0; i < subscribers.length; i++) {
    const subscriber = subscribers[i];
    emit({ step: 'templates', status: 'progress', label: 'Rendering personalized emails', current: i + 1, total: subscribers.length });
    const chart = subscriber.chart?.chart ? parseChartForEmail(subscriber.chart.chart) : null;
    const issue = await getNewsletterIssue(newsletterNumber, subscriber.first_name, chart, subscriber.id);
    if (!issue) {
      throw new Error(`Failed to build newsletter #${newsletterNumber} for ${subscriber.email}`);
    }
    rendered.push({
      subscriber,
      subject: issue.subject,
      html: renderNewsletterEmail({
        bodyHtml: issue.bodyHtml,
        unsubscribeUrl: buildUnsubscribeUrl(subscriber.unsub_token, emailLabel),
        ps: issue.ps,
        preview: issue.preview,
        note,
      }),
    });
  }
  emit({
    step: 'templates',
    status: 'done',
    label: 'Rendering personalized emails',
    detail: `${rendered.length} rendered${note ? ', note included' : ''}`,
  });

  setStep('broadcast');
  emit({ step: 'broadcast', status: 'start', label: 'Scheduling individual emails' });
  const { from, replyTo } = getBroadcastSender();
  const sent: { subscriberId: string; emailId: string }[] = [];
  for (let i = 0; i < rendered.length; i++) {
    const { subscriber, subject, html } = rendered[i];
    emit({ step: 'broadcast', status: 'progress', label: 'Scheduling individual emails', current: i + 1, total: rendered.length });
    const result = await sendNewsletterEmail({
      to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
      subject,
      html,
      unsubToken: subscriber.unsub_token,
      emailLabel,
      from,
      replyTo,
      scheduledAt: scheduledDate.toISOString(),
    });
    if (result.success && result.id) {
      sent.push({ subscriberId: subscriber.id, emailId: result.id });
    }
  }
  if (sent.length === 0) {
    throw new Error('No emails could be scheduled');
  }
  emit({ step: 'broadcast', status: 'done', label: 'Scheduling individual emails', detail: `${sent.length} scheduled` });

  setStep('records');
  emit({ step: 'records', status: 'start', label: 'Recording schedule' });
  for (const { subscriberId, emailId } of sent) {
    await recordEmailSend({
      subscriberId,
      emailType: emailLabel,
      category: 'newsletter',
      resendEmailId: emailId,
    });
  }
  const schedule = await insertNewsletterSchedule({
    newsletterNum: newsletterNumber,
    kind: 'direct',
    broadcastId: null,
    segmentId: null,
    newsletterSegmentId: null,
    resendEmailIds: sent.map(s => s.emailId),
    scheduledAt: scheduledDate,
    subscriberCount: sent.length,
  });
  emit({ step: 'records', status: 'done', label: 'Recording schedule' });

  console.log(
    `[schedule] Newsletter #${newsletterNumber} scheduled as ${sent.length} direct email(s) for ${scheduledDate.toISOString()}`,
  );

  emit({
    step: 'complete',
    result: {
      scheduleId: schedule.id,
      kind: 'direct',
      broadcastId: null,
      segmentId: null,
      contactCount: sent.length,
      scheduledAt: scheduledDate.toISOString(),
    },
  });
}
