import { NextRequest, NextResponse } from 'next/server';
import { getDueNewsletterSubscribers, advanceEmailSeries } from '@/lib/db';
import { sendWelcomeEmail, formatEmailRecipient } from '@/emails/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getNewsletterEmail, getNewsletterSubject, getNewsletterCount } from '@/emails/newsletter';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';

function getNextWeekDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Cron endpoint: sends due newsletter emails.
 * Secured by CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>).
 * Runs daily at 16:00 UTC (configured in vercel.json).
 *
 * The CRON_EMAIL_ENABLED kill switch is checked here — when not 'true',
 * the route returns early without querying or sending anything.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[cron] Unauthorized newsletter cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Kill switch
  if (process.env.CRON_EMAIL_ENABLED !== 'true') {
    console.log('[cron] Newsletter cron disabled (CRON_EMAIL_ENABLED !== true)');
    return NextResponse.json({ disabled: true });
  }

  console.log(`[cron] Newsletter tick at ${new Date().toISOString()}`);

  const totalNewsletters = getNewsletterCount();
  if (totalNewsletters === 0) {
    console.log('[cron] No newsletter files found, skipping');
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, noNewsletters: true });
  }

  const dueSubscribers = await getDueNewsletterSubscribers(WELCOME_SERIES_LENGTH);
  console.log(`[cron] Found ${dueSubscribers.length} subscriber(s) due for newsletter`);

  let sent = 0;
  let skipped = 0;

  for (const subscriber of dueSubscribers) {
    // Convert next_step to newsletter number (1-based)
    const newsletterStep = subscriber.next_step - WELCOME_SERIES_LENGTH;

    if (newsletterStep > totalNewsletters) {
      // All available newsletters sent — mark complete
      await advanceEmailSeries(subscriber.id, subscriber.next_step, null);
      skipped++;
      continue;
    }

    const chart = parseChartForEmail(subscriber.chart.chart);
    const subject = getNewsletterSubject(newsletterStep, subscriber.first_name);
    const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${subscriber.unsub_token}`;
    const emailComponent = getNewsletterEmail(newsletterStep, subscriber, chart, unsubscribeUrl);

    if (!emailComponent) {
      skipped++;
      continue;
    }

    const result = await sendWelcomeEmail({
      to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
      subject,
      react: emailComponent,
      unsubToken: subscriber.unsub_token
    });

    if (result.success) {
      const nextStep = subscriber.next_step + 1;
      const nextNewsletterStep = nextStep - WELCOME_SERIES_LENGTH;
      // If there are more newsletters, schedule 7 days out; otherwise mark complete
      const nextSendAt = nextNewsletterStep <= totalNewsletters
        ? getNextWeekDate()
        : null;
      await advanceEmailSeries(subscriber.id, nextStep, nextSendAt);
      sent++;
    } else {
      skipped++;
    }
  }

  console.log(`[cron] Newsletter done: sent=${sent} skipped=${skipped}`);
  return NextResponse.json({ ok: true, sent, skipped });
}
