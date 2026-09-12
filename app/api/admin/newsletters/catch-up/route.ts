import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import {
  getNewsletterDueSubscribers,
  getNewsletterSendDates,
  advanceEmailSeries,
  recordEmailSend,
} from '@/lib/db';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getNewsletterWithChart } from '@/emails/newsletter-loader';
import { NewsletterTemplate } from '@/emails/newsletter-template';
import { renderEmail, buildUnsubscribeUrl } from '@/emails/send';
import { sendPrerenderedBroadcast } from '@/lib/resend-broadcasts';

/**
 * POST /api/admin/newsletters/catch-up
 *
 * Send a newsletter to late-joiner subscribers who missed the original broadcast.
 *
 * Body: { newsletterNumber: number }
 *
 * For each subscriber whose next_step equals the newsletter number AND the
 * newsletter has already been sent, renders the newsletter with the subscriber's
 * chart data and sends as a broadcast-of-one via Resend.
 *
 * Advances next_step and records email_send for each subscriber.
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
    const { newsletterNumber } = body;

    if (typeof newsletterNumber !== 'number' || newsletterNumber < 1) {
      return NextResponse.json({ error: 'Invalid newsletterNumber' }, { status: 400 });
    }

    // Verify the newsletter has actually been sent before
    const sendDates = await getNewsletterSendDates();
    if (!sendDates.has(newsletterNumber)) {
      return NextResponse.json(
        { error: `Newsletter #${newsletterNumber} has not been sent yet` },
        { status: 422 },
      );
    }

    // Get subscribers due for this newsletter (late joiners)
    const allDue = await getNewsletterDueSubscribers(WELCOME_SERIES_LENGTH);
    const catchUpSubscribers = allDue.filter(s => s.next_step === newsletterNumber);

    if (catchUpSubscribers.length === 0) {
      return NextResponse.json(
        { error: 'No subscribers need catch-up for this newsletter' },
        { status: 422 },
      );
    }

    let sent = 0;
    const errors: string[] = [];

    for (const subscriber of catchUpSubscribers) {
      try {
        const chart = parseChartForEmail(subscriber.chart.chart);
        const emailLabel = `newsletter_${newsletterNumber}`;
        const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsub_token, emailLabel);

        // Render with subscriber's chart data (resolves Liquid conditionals)
        const newsletter = await getNewsletterWithChart(
          newsletterNumber,
          subscriber.first_name,
          chart,
          subscriber.id,
        );
        if (!newsletter) {
          errors.push(`${subscriber.email}: failed to render newsletter`);
          continue;
        }

        const emailComponent = React.createElement(NewsletterTemplate, {
          preview: newsletter.preview,
          bodyHtml: newsletter.bodyHtml,
          image: newsletter.image,
          chart,
          unsubscribeUrl,
          number: newsletter.number,
          ps: newsletter.ps,
        });

        const html = await renderEmail(emailComponent);

        const { broadcastId } = await sendPrerenderedBroadcast({
          name: `Catch-up: Newsletter #${newsletterNumber} → ${subscriber.email}`,
          html,
          subject: newsletter.subject,
          subscriber,
        });

        // Advance next_step and record
        await advanceEmailSeries(subscriber.id, subscriber.next_step + 1);
        await recordEmailSend({
          subscriberId: subscriber.id,
          emailType: emailLabel,
          category: 'newsletter',
          resendBroadcastId: broadcastId,
        });

        sent++;
        console.log(
          `[catch-up] Sent newsletter #${newsletterNumber} to ${subscriber.email} (broadcast=${broadcastId})`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[catch-up] Failed for ${subscriber.email}:`, msg);
        errors.push(`${subscriber.email}: ${msg}`);
      }
    }

    return NextResponse.json({
      sent,
      total: catchUpSubscribers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[admin/newsletters/catch-up] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
