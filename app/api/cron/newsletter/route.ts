import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getNewsletterDueSubscribers, advanceEmailSeries, acquireCronLock, recordEmailSend } from '@/lib/db';
import { sendWelcomeEmail, formatEmailRecipient, buildUnsubscribeUrl } from '@/emails/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getNewsletterEmail, getNewsletterSubject, getMaxNewsletterNumber } from '@/emails/newsletter';
import { hasInlinePersonalization } from '@/emails/newsletter-template';
import { sendNewsletterBroadcast, syncBroadcastContactProperties } from '@/lib/resend-broadcasts';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import type { Subscriber } from '@/lib/types/subscriber';

/**
 * Cron endpoint: sends due newsletter emails.
 * Secured by CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>).
 * Runs weekly on Wednesdays at 14:47 UTC (configured in vercel.json).
 *
 * Dual-path sending:
 * - Newsletters with inline personalization (#4, #5) → transactional (one email per subscriber)
 * - All others → Resend broadcast (single API call, no daily limit)
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

  const maxNewsletterNumber = getMaxNewsletterNumber();
  if (maxNewsletterNumber === 0) {
    console.log('[cron] No newsletter files found, skipping');
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, noNewsletters: true });
  }

  const dueSubscribers = await getNewsletterDueSubscribers(WELCOME_SERIES_LENGTH);
  console.log(`[cron] Found ${dueSubscribers.length} subscriber(s) due for newsletter`);

  // Group subscribers by their next_step (newsletter number)
  const groups = new Map<number, Subscriber[]>();
  for (const subscriber of dueSubscribers) {
    if (subscriber.next_step > maxNewsletterNumber) continue;
    const existing = groups.get(subscriber.next_step);
    if (existing) {
      existing.push(subscriber);
    } else {
      groups.set(subscriber.next_step, [subscriber]);
    }
  }

  let sent = 0;
  let skipped = dueSubscribers.filter(s => s.next_step > maxNewsletterNumber).length;

  for (const [newsletterNumber, subscribers] of groups) {
    if (hasInlinePersonalization(newsletterNumber)) {
      // Transactional path: send individually (body differs per subscriber)
      for (const subscriber of subscribers) {
        const chart = parseChartForEmail(subscriber.chart.chart);
        const subject = getNewsletterSubject(newsletterNumber, subscriber.first_name, subscriber.id);
        const emailLabel = `newsletter_${newsletterNumber}`;
        const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsub_token, emailLabel);
        const emailComponent = getNewsletterEmail(newsletterNumber, subscriber, chart, unsubscribeUrl);

        if (!emailComponent) {
          skipped++;
          continue;
        }

        const result = await sendWelcomeEmail({
          to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
          subject,
          react: emailComponent,
          unsubToken: subscriber.unsub_token,
          emailLabel,
        });

        if (result.success) {
          await advanceEmailSeries(subscriber.id, subscriber.next_step + 1);
          await recordEmailSend({
            subscriberId: subscriber.id,
            emailType: `newsletter_${newsletterNumber}`,
            category: 'newsletter',
            resendEmailId: result.id,
          });
          sent++;
        } else {
          skipped++;
        }
      }
    } else {
      // Broadcast path: sync contact properties, then single API call for the whole group
      try {
        await syncBroadcastContactProperties(subscribers);
        const emails = subscribers.map(s => s.email);
        const result = await sendNewsletterBroadcast(newsletterNumber, emails);
        // Advance next_step and record send for all subscribers in the group
        for (const subscriber of subscribers) {
          await advanceEmailSeries(subscriber.id, subscriber.next_step + 1);
          await recordEmailSend({
            subscriberId: subscriber.id,
            emailType: `newsletter_${newsletterNumber}`,
            category: 'newsletter',
            resendBroadcastId: result.broadcastId,
          });
        }
        sent += result.contactCount;

        console.log(`[cron] Broadcast newsletter #${newsletterNumber}: ${result.contactCount} contacts, broadcast=${result.broadcastId}`);
      } catch (err) {
        console.error(`[cron] Failed to broadcast newsletter #${newsletterNumber}:`, err);
        skipped += subscribers.length;
      }
    }
  }

  if (sent > 0) {
    revalidatePath('/newsletter');
  }

  console.log(`[cron] Newsletter done: sent=${sent} skipped=${skipped}`);
  return NextResponse.json({ ok: true, sent, skipped });
}
