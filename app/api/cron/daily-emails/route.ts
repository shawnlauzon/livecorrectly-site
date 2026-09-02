import { NextRequest, NextResponse } from 'next/server';
import { getWelcomeDueSubscribers, advanceEmailSeries, acquireCronLock } from '@/lib/db';
import { sendWelcomeEmail, formatEmailRecipient, buildUnsubscribeUrl } from '@/emails/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getWelcomeSubject } from '@/emails/subjects';
import { getWelcomeEmail, WELCOME_SERIES_LENGTH } from '@/emails/welcome';

/**
 * Cron endpoint: sends per-subscriber daily emails.
 * Currently handles the welcome series (days 1-3).
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
    console.log('[cron] Daily emails disabled (CRON_EMAIL_ENABLED !== true)');
    return NextResponse.json({ disabled: true });
  }

  console.log(`[cron] Daily emails tick at ${new Date().toISOString()}`);

  // Idempotency: only one run per calendar day
  const acquired = await acquireCronLock('daily-emails');
  if (!acquired) {
    console.log('[cron] Daily emails already ran today, skipping duplicate execution');
    return NextResponse.json({ ok: true, duplicate: true, sent: 0, skipped: 0 });
  }

  // --- Welcome series ---
  const welcomeDue = await getWelcomeDueSubscribers(WELCOME_SERIES_LENGTH);
  console.log(`[cron] Found ${welcomeDue.length} welcome-due subscriber(s)`);

  let sent = 0;
  let skipped = 0;

  for (const subscriber of welcomeDue) {
    const step = subscriber.next_step;

    const chart = parseChartForEmail(subscriber.chart.chart);
    const subject = getWelcomeSubject(step, subscriber.first_name, chart);
    const emailLabel = `welcome${step}`;
    const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsub_token, emailLabel);
    const emailComponent = getWelcomeEmail(step, subscriber, chart, unsubscribeUrl);

    if (!emailComponent) {
      skipped++;
      continue;
    }

    const result = await sendWelcomeEmail({
      to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
      subject,
      react: emailComponent,
      unsubToken: subscriber.unsub_token,
      emailLabel
    });

    if (result.success) {
      await advanceEmailSeries(subscriber.id, step + 1);
      sent++;
    } else {
      skipped++;
    }
  }

  // --- Future: birthday emails, one-off broadcasts via broadcast_sends, etc. ---

  console.log(`[cron] Done: sent=${sent} skipped=${skipped}`);
  return NextResponse.json({ ok: true, sent, skipped });
}
