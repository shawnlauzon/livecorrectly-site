import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import {
  getNewsletterDueSubscribers,
  advanceEmailSeries,
  recordEmailSend,
  insertNewsletterSchedule,
  getScheduleForNewsletter,
} from '@/lib/db';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import { loadNewsletter } from '@/newsletters/loader';
import { processConditionals } from '@/newsletters/conditionals';
import {
  hasLiquidConditionals,
  extractDynamicSections,
  buildDynamicContactProperties,
} from '@/newsletters/liquid-properties';
import {
  renderNewsletterForBroadcast,
  renderNewsletterForBroadcastWithMarkdown,
  syncBroadcastContactProperties,
} from '@/lib/resend-broadcasts';
import { getResendClient } from '@/lib/resend-contacts';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';

/**
 * POST /api/admin/newsletters/schedule
 *
 * Schedule a newsletter for broadcast delivery at a specific date/time.
 *
 * Body: { newsletterNumber: number, scheduledAt: string (ISO 8601) }
 *
 * Pipeline:
 * 1. Query due subscribers (by next_step)
 * 2. If Liquid conditionals exist: extract dynamic sections, render per-subscriber,
 *    sync as contact properties, render broadcast template with placeholders
 * 3. If no Liquid: render broadcast template normally
 * 4. Sync standard chart contact properties
 * 5. Create ephemeral segment, add subscribers
 * 6. Create broadcast with scheduledAt
 * 7. Advance next_step, record email sends
 * 8. Record in newsletter_schedules table
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

  try {
    const body = await request.json();
    const { newsletterNumber, scheduledAt } = body;

    if (typeof newsletterNumber !== 'number' || newsletterNumber < 1) {
      return NextResponse.json({ error: 'Invalid newsletterNumber' }, { status: 400 });
    }
    if (!scheduledAt || isNaN(Date.parse(scheduledAt))) {
      return NextResponse.json({ error: 'Invalid scheduledAt' }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'scheduledAt must be in the future' },
        { status: 400 },
      );
    }

    // Check if already scheduled
    const existingSchedule = await getScheduleForNewsletter(newsletterNumber);
    if (existingSchedule && existingSchedule.status === 'scheduled') {
      return NextResponse.json(
        { error: `Newsletter #${newsletterNumber} is already scheduled (broadcast ${existingSchedule.broadcast_id})` },
        { status: 409 },
      );
    }

    // Load the newsletter markdown
    const raw = loadNewsletter(newsletterNumber);
    if (!raw) {
      return NextResponse.json(
        { error: `Newsletter #${newsletterNumber} not found` },
        { status: 404 },
      );
    }

    // Get due subscribers
    const allDue = await getNewsletterDueSubscribers(WELCOME_SERIES_LENGTH);
    const subscribers = allDue.filter(s => s.next_step === newsletterNumber);

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No subscribers are due for this newsletter' },
        { status: 422 },
      );
    }

    const client = getResendClient();

    // Resolve channel conditionals (keep email content, strip web)
    const channelResolved = processConditionals(raw.bodyMarkdown.trim(), 'email');
    const hasLiquid = hasLiquidConditionals(channelResolved);

    let html: string;
    let subject: string;

    if (hasLiquid) {
      // --- Liquid path: extract dynamic sections, render per-subscriber, create broadcast with placeholders ---

      const { broadcastTemplate, sections } = extractDynamicSections(
        channelResolved,
        newsletterNumber,
      );

      // Ensure dynamic section contact properties exist in Resend
      for (const section of sections) {
        const { error } = await client.contactProperties.create({
          key: section.propertyKey,
          type: 'string' as const,
        });
        if (error) {
          if ('statusCode' in error && (error as { statusCode: number }).statusCode === 409) {
            // Property already exists — expected
          } else {
            throw new Error(
              `Failed to create contact property ${section.propertyKey}: ${JSON.stringify(error)}`,
            );
          }
        }
      }

      // Render dynamic sections for each subscriber and sync as contact properties
      for (const subscriber of subscribers) {
        if (!subscriber.chart?.chart) {
          console.warn(
            `[schedule] Subscriber ${subscriber.email} has no chart data, skipping Liquid rendering`,
          );
          continue;
        }
        const chart = parseChartForEmail(subscriber.chart.chart);
        const dynamicProps = await buildDynamicContactProperties(
          channelResolved,
          chart,
          newsletterNumber,
        );

        if (Object.keys(dynamicProps).length > 0) {
          const { error } = await client.contacts.update({
            email: subscriber.email,
            properties: dynamicProps,
          });
          if (error) {
            console.warn(
              `[schedule] Failed to sync dynamic properties for ${subscriber.email}:`,
              error,
            );
          }
        }
      }

      // Render broadcast HTML using the template with contact property placeholders
      const rendered = await renderNewsletterForBroadcastWithMarkdown(
        newsletterNumber,
        broadcastTemplate,
      );
      html = rendered.html;
      subject = rendered.subject;
    } else {
      // --- Standard path: no Liquid, render normally ---
      const rendered = await renderNewsletterForBroadcast(newsletterNumber);
      html = rendered.html;
      subject = rendered.subject;
    }

    // Sync standard broadcast contact properties (chart type, strategy, etc.)
    await syncBroadcastContactProperties(subscribers);

    // Clean up stale ephemeral segments
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

    // Create ephemeral segment
    const segmentName = `newsletter_${newsletterNumber}_scheduled_${Date.now()}`;
    const { data: segmentData, error: segmentError } = await client.segments.create({
      name: segmentName,
    });
    if (segmentError || !segmentData) {
      throw new Error(`Failed to create segment: ${JSON.stringify(segmentError)}`);
    }
    const segmentId = segmentData.id;

    // Add subscribers to segment
    let contactCount = 0;
    for (const subscriber of subscribers) {
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

    // Create broadcast with scheduledAt
    const broadcastDomain = process.env.EMAIL_DOMAIN_BROADCAST;
    const from = broadcastDomain
      ? `Shawn Lauzon <shawn@${broadcastDomain}>`
      : process.env.EMAIL_FROM_MARKETING ?? 'Shawn Lauzon <updates@livecorrectly.com>';
    const replyTo = broadcastDomain
      ? undefined
      : process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';

    const { data: broadcastData, error: broadcastError } = await client.broadcasts.create({
      name: `Newsletter #${newsletterNumber}`,
      segmentId,
      from,
      replyTo,
      subject,
      html,
      send: true,
      scheduledAt: scheduledDate.toISOString(),
    });

    if (broadcastError || !broadcastData) {
      throw new Error(`Failed to create broadcast: ${JSON.stringify(broadcastError)}`);
    }

    const broadcastId = broadcastData.id;

    // Advance next_step and record email sends for all subscribers
    for (const subscriber of subscribers) {
      await advanceEmailSeries(subscriber.id, subscriber.next_step + 1);
      await recordEmailSend({
        subscriberId: subscriber.id,
        emailType: `newsletter_${newsletterNumber}`,
        category: 'newsletter',
        resendBroadcastId: broadcastId,
      });
    }

    // Record in newsletter_schedules
    const schedule = await insertNewsletterSchedule({
      newsletterNum: newsletterNumber,
      broadcastId,
      segmentId,
      scheduledAt: scheduledDate,
      subscriberCount: contactCount,
    });

    console.log(
      `[schedule] Newsletter #${newsletterNumber} scheduled as broadcast ${broadcastId} for ${scheduledDate.toISOString()}, ${contactCount} contacts`,
    );

    return NextResponse.json({
      ok: true,
      scheduleId: schedule.id,
      broadcastId,
      segmentId,
      contactCount,
      scheduledAt: scheduledDate.toISOString(),
    });
  } catch (error) {
    console.error('[admin/newsletters/schedule] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
