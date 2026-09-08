import { NextRequest, NextResponse } from 'next/server';
import { getBroadcastCandidates, recordBroadcastSend } from '@/lib/db';
import { getEnabledBroadcasts } from '@/emails/broadcast-config';
import { sendBroadcastViaBroadcastApi } from '@/lib/resend-broadcasts';

/**
 * Cron endpoint: sends broadcast campaign emails via the Resend Broadcast API.
 * Iterates all enabled broadcasts in BROADCASTS config, querying candidates
 * for each, applying the broadcast's filter predicate, then sending to all
 * eligible subscribers as a single Resend broadcast (not individual emails).
 *
 * Secured by CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>).
 * Runs daily at 15:00 UTC (configured in vercel.json).
 *
 * Self-terminating per broadcast: when all eligible subscribers have been sent,
 * the query returns 0 rows and the cron does nothing for that broadcast.
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
    console.log('[cron:broadcast] Broadcasts disabled (CRON_EMAIL_ENABLED !== true)');
    return NextResponse.json({ disabled: true });
  }

  console.log(`[cron:broadcast] Tick at ${new Date().toISOString()}`);

  const enabledBroadcasts = getEnabledBroadcasts();
  if (enabledBroadcasts.length === 0) {
    console.log('[cron:broadcast] No enabled broadcasts');
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let totalSent = 0;

  for (const [slug, config] of enabledBroadcasts) {
    const candidates = await getBroadcastCandidates(slug);
    const recipients = candidates.filter(config.filter);
    console.log(`[cron:broadcast] ${slug}: ${recipients.length} eligible recipient(s) (${candidates.length} candidates)`);

    if (recipients.length === 0) continue;

    const { broadcastId, contactCount } = await sendBroadcastViaBroadcastApi(slug, recipients);
    console.log(`[cron:broadcast] ${slug}: broadcast ${broadcastId} sent to ${contactCount} contacts`);

    // Record sends so these subscribers aren't re-queried next time
    for (const subscriber of recipients) {
      await recordBroadcastSend(subscriber.id, slug);
    }

    totalSent += contactCount;
  }

  console.log(`[cron:broadcast] Done: sent=${totalSent}`);
  return NextResponse.json({ ok: true, sent: totalSent });
}
