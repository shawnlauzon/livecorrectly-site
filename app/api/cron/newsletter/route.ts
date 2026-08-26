import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getNewsletterDueSubscribers, advanceEmailSeries, recordNewsletterSend, acquireCronLock } from '@/lib/db';
import { sendWelcomeEmail, formatEmailRecipient } from '@/emails/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getNewsletterEmail, getNewsletterSubject, getNewsletterCount } from '@/emails/newsletter';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';

/**
 * Cron endpoint: sends due newsletter emails.
 * Secured by CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>).
 * Runs weekly on Wednesdays at 14:47 UTC (configured in vercel.json).
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

  // Idempotency: only one run per calendar day
  const acquired = await acquireCronLock('newsletter');
  if (!acquired) {
    console.log('[cron] Newsletter already ran today, skipping duplicate execution');
    return NextResponse.json({ ok: true, duplicate: true, sent: 0, skipped: 0 });
  }

  const totalNewsletters = getNewsletterCount();
  if (totalNewsletters === 0) {
    console.log('[cron] No newsletter files found, skipping');
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, noNewsletters: true });
  }

  const dueSubscribers = await getNewsletterDueSubscribers(WELCOME_SERIES_LENGTH);
  console.log(`[cron] Found ${dueSubscribers.length} subscriber(s) due for newsletter`);

  let sent = 0;
  let skipped = 0;

  for (const subscriber of dueSubscribers) {
    // Convert next_step to newsletter number (1-based)
    const newsletterStep = subscriber.next_step - WELCOME_SERIES_LENGTH;

    if (newsletterStep > totalNewsletters) {
      // All available newsletters sent — no action needed
      skipped++;
      continue;
    }

    const chart = parseChartForEmail(subscriber.chart.chart);
    const subject = getNewsletterSubject(newsletterStep, subscriber.first_name, subscriber.id);
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
      await advanceEmailSeries(subscriber.id, subscriber.next_step + 1);
      await recordNewsletterSend(newsletterStep);
      sent++;
    } else {
      skipped++;
    }
  }

  if (sent > 0) {
    revalidatePath('/newsletter');
  }

  console.log(`[cron] Newsletter done: sent=${sent} skipped=${skipped}`);
  return NextResponse.json({ ok: true, sent, skipped });
}
