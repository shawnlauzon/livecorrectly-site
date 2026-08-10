import { NextRequest, NextResponse } from 'next/server';
import { getBroadcastRecipients, recordBroadcastSend } from '@/lib/db';
import { sendEmail, formatEmailRecipient } from '@/emails/send';
import { Reengagement } from '@/emails/reengagement';

// --- Broadcast configuration ---
const BROADCAST_SLUG = 'reengagement-2026-08';
const CUTOFF_DATE = '2026-01-01';
const BATCH_SIZE = 25;
const SUBJECT = 'I sent you five emails last year and then disappeared';

function formatMonthYear(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function monthsSince(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return (now.getUTCFullYear() - created.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - created.getUTCMonth());
}

/**
 * Cron endpoint: sends broadcast re-engagement emails in daily batches.
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
    console.error('[cron:broadcast] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Kill switch: only the automated cron respects this flag.
  if (process.env.CRON_EMAIL_ENABLED !== 'true') {
    console.log('[cron:broadcast] Broadcast disabled (CRON_EMAIL_ENABLED !== true)');
    return NextResponse.json({ disabled: true });
  }

  console.log(`[cron:broadcast] Tick at ${new Date().toISOString()}, slug=${BROADCAST_SLUG}`);

  const recipients = await getBroadcastRecipients(BROADCAST_SLUG, CUTOFF_DATE, BATCH_SIZE);
  console.log(`[cron:broadcast] Found ${recipients.length} eligible recipient(s)`);

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
  }

  const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
  let sent = 0;
  let skipped = 0;

  for (const subscriber of recipients) {
    const monthYear = formatMonthYear(subscriber.created_at);
    const monthsSinceSignup = monthsSince(subscriber.created_at);
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${subscriber.unsub_token}`;
    const chartUrl = `${appUrl}/see-your-design/${subscriber.id}?utm_source=livecorrectly&utm_medium=email&utm_campaign=reengagement_2026`;

    const result = await sendEmail({
      to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
      subject: SUBJECT,
      react: Reengagement({
        firstName: subscriber.first_name,
        monthYear,
        monthsSinceSignup,
        chartUrl,
        unsubscribeUrl,
      }),
      unsubToken: subscriber.unsub_token,
    });

    if (result.success) {
      await recordBroadcastSend(subscriber.id, BROADCAST_SLUG);
      sent++;
    } else {
      skipped++;
    }
  }

  console.log(`[cron:broadcast] Done: sent=${sent} skipped=${skipped}`);
  return NextResponse.json({ ok: true, sent, skipped });
}
