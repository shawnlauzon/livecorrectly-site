import { NextRequest, NextResponse } from 'next/server';
import { getDueSubscribers, advanceEmailSeries } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getWelcomeSubject } from '@/lib/email-subjects';
import { Welcome1 } from '@/emails/welcome1';
import { Welcome2 } from '@/emails/welcome2';
import { Welcome3 } from '@/emails/welcome3';
import { Welcome4 } from '@/emails/welcome4';
import { Welcome5 } from '@/emails/welcome5';
import { Subscriber } from '@/lib/types/subscriber';
import React from 'react';

const WELCOME_SERIES_LENGTH = 5;

/**
 * Cron endpoint: sends due welcome series emails.
 * Secured by CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>).
 * Runs daily at 14:00 UTC (configured in vercel.json).
 *
 * The EMAIL_SENDING_ENABLED kill switch in sendEmail() makes this safe
 * even if the route is hit — emails are logged but not sent.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[cron] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log(`[cron] Newsletter tick at ${new Date().toISOString()}`);

  const dueSubscribers = await getDueSubscribers();
  console.log(`[cron] Found ${dueSubscribers.length} due subscriber(s)`);

  let sent = 0;
  let skipped = 0;

  for (const subscriber of dueSubscribers) {
    const step = subscriber.seq_position + 1; // seq_position is 0-indexed, steps are 1-indexed

    if (step > WELCOME_SERIES_LENGTH) {
      // Series complete — clear next_send_at
      await advanceEmailSeries(subscriber.id, subscriber.seq_position, null);
      skipped++;
      continue;
    }

    const chart = parseChartForEmail(subscriber.chart.chart);
    const subject = getWelcomeSubject(step, subscriber.first_name, chart);
    const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${subscriber.unsub_token}`;
    const bookingUrl =
      process.env.NEXT_PUBLIC_BOOKING_URL ?? 'https://livecorrectly.com';

    const emailComponent = getWelcomeEmail(step, subscriber, chart, unsubscribeUrl, bookingUrl);

    if (!emailComponent) {
      skipped++;
      continue;
    }

    const result = await sendEmail({
      to: subscriber.email,
      subject,
      react: emailComponent,
      unsubToken: subscriber.unsub_token
    });

    if (result.success) {
      // Advance to next step; set next_send_at to tomorrow at same time
      const nextSendAt =
        step < WELCOME_SERIES_LENGTH
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : null;
      await advanceEmailSeries(subscriber.id, step, nextSendAt);
      sent++;
    } else {
      skipped++;
    }
  }

  console.log(`[cron] Done: sent=${sent} skipped=${skipped}`);
  return NextResponse.json({ ok: true, sent, skipped });
}

function getWelcomeEmail(
  step: number,
  subscriber: Subscriber,
  chart: ReturnType<typeof parseChartForEmail>,
  unsubscribeUrl: string,
  bookingUrl: string
): React.ReactElement | null {
  const props = {
    firstName: subscriber.first_name,
    chart,
    unsubscribeUrl
  };

  switch (step) {
    case 1:
      return React.createElement(Welcome1, props);
    case 2:
      return React.createElement(Welcome2, props);
    case 3:
      return React.createElement(Welcome3, props);
    case 4:
      return React.createElement(Welcome4, props);
    case 5:
      return React.createElement(Welcome5, { ...props, bookingUrl });
    default:
      return null;
  }
}
