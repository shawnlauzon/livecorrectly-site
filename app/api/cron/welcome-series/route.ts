import { NextRequest, NextResponse } from 'next/server';
import { getDueSubscribers, advanceEmailSeries } from '@/lib/db';
import { sendEmail } from '@/emails/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getWelcomeSubject } from '@/emails/subjects';
import { getWelcomeEmail, WELCOME_SERIES_LENGTH } from '@/emails/welcome';

function getTomorrowDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Cron endpoint: sends due welcome series emails.
 * Secured by CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>).
 * Runs daily at 14:00 UTC (configured in vercel.json).
 *
 * The CRON_EMAIL_ENABLED kill switch is checked here — when not 'true',
 * the route returns early without querying or sending anything.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[cron] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Kill switch: only the automated cron respects this flag.
  // Admin manual sends bypass it intentionally.
  if (process.env.CRON_EMAIL_ENABLED !== 'true') {
    console.log('[cron] Welcome series disabled (CRON_EMAIL_ENABLED !== true)');
    return NextResponse.json({ disabled: true });
  }

  console.log(`[cron] Welcome series tick at ${new Date().toISOString()}`);

  const dueSubscribers = await getDueSubscribers();
  console.log(`[cron] Found ${dueSubscribers.length} due subscriber(s)`);

  let sent = 0;
  let skipped = 0;

  for (const subscriber of dueSubscribers) {
    const step = subscriber.next_step;

    if (step > WELCOME_SERIES_LENGTH) {
      // Series complete — clear next_send_at
      await advanceEmailSeries(subscriber.id, subscriber.next_step, null);
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
      // Advance to next step; set next_send_at to tomorrow's date
      const nextSendAt =
        step < WELCOME_SERIES_LENGTH
          ? getTomorrowDate()
          : null;
      await advanceEmailSeries(subscriber.id, step + 1, nextSendAt);
      sent++;
    } else {
      skipped++;
    }
  }

  console.log(`[cron] Done: sent=${sent} skipped=${skipped}`);
  return NextResponse.json({ ok: true, sent, skipped });
}
