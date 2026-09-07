import { NextRequest, NextResponse } from 'next/server';
import { getBroadcastRecipients, recordBroadcastSend } from '@/lib/db';
import { sendMarketingEmail, _sendEmail, formatEmailRecipient } from '@/emails/send';
import { buildBroadcastEmail, BROADCASTS, BroadcastSlug } from '@/emails/broadcast-config';

// --- One-off campaign configuration ---
const BROADCAST_SLUG: BroadcastSlug = 'restart-notice-2026-09';
const CUTOFF_DATE = '2026-09-01';
const BATCH_SIZE = 25;

/**
 * Cron endpoint: sends one-off campaign emails in daily batches.
 * Secured by CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>).
 * Runs daily at 15:00 UTC (configured in vercel.json).
 *
 * Self-terminating: when all eligible subscribers have been sent,
 * the query returns 0 rows and the cron does nothing.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[cron:one-off] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Kill switch: only the automated cron respects this flag.
  if (process.env.CRON_EMAIL_ENABLED !== 'true') {
    console.log('[cron:one-off] Broadcast disabled (CRON_EMAIL_ENABLED !== true)');
    return NextResponse.json({ disabled: true });
  }

  const broadcastConfig = BROADCASTS[BROADCAST_SLUG];
  const nextStepFilter = broadcastConfig?.nextStepFilter;

  console.log(`[cron:one-off] Tick at ${new Date().toISOString()}, slug=${BROADCAST_SLUG}`);

  const recipients = await getBroadcastRecipients(BROADCAST_SLUG, CUTOFF_DATE, BATCH_SIZE, nextStepFilter);
  console.log(`[cron:one-off] Found ${recipients.length} eligible recipient(s)`);

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
  }

  let sent = 0;
  let skipped = 0;

  for (const subscriber of recipients) {
    // Use shared broadcast builder to ensure identical output across all code paths
    const { element, subject, emailLabel, from: customFrom } = buildBroadcastEmail(
      BROADCAST_SLUG,
      subscriber.id,
      subscriber.first_name,
      subscriber.created_at,
      subscriber.unsub_token
    );

    let result: { success: boolean; id?: string };

    if (customFrom) {
      // Custom from address: use _sendEmail directly with replyTo
      result = await _sendEmail({
        to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
        subject,
        react: element,
        unsubToken: subscriber.unsub_token,
        from: customFrom,
        replyTo: 'shawn@livecorrectly.com',
        emailLabel,
      });
    } else {
      result = await sendMarketingEmail({
        to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
        subject,
        react: element,
        unsubToken: subscriber.unsub_token,
        emailLabel,
      });
    }

    if (result.success) {
      await recordBroadcastSend(subscriber.id, BROADCAST_SLUG);
      sent++;
    } else {
      skipped++;
    }
  }

  console.log(`[cron:one-off] Done: sent=${sent} skipped=${skipped}`);
  return NextResponse.json({ ok: true, sent, skipped });
}
