import { NextRequest, NextResponse } from 'next/server';
import { getBroadcastCandidates, recordBroadcastSend } from '@/lib/db';
import { sendMarketingEmail, _sendEmail, formatEmailRecipient } from '@/emails/send';
import { buildBroadcastEmail, getEnabledBroadcasts } from '@/emails/broadcast-config';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';

/**
 * Cron endpoint: sends broadcast campaign emails in daily batches.
 * Iterates all enabled broadcasts in BROADCASTS config, querying candidates
 * for each, applying the broadcast's filter predicate, and sending up to
 * batchSize per broadcast per tick.
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
    return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
  }

  let totalSent = 0;
  let totalSkipped = 0;

  for (const [slug, config] of enabledBroadcasts) {
    const candidates = await getBroadcastCandidates(slug);
    const recipients = candidates.filter(config.filter).slice(0, config.batchSize);
    console.log(`[cron:broadcast] ${slug}: ${recipients.length} eligible recipient(s) (${candidates.length} candidates)`);

    if (recipients.length === 0) continue;

    let sent = 0;
    let skipped = 0;

    for (const subscriber of recipients) {
      const chart = parseChartForEmail(subscriber.chart.chart);
      const { element, subject, emailLabel, from: customFrom } = buildBroadcastEmail(
        slug,
        subscriber.id,
        subscriber.first_name,
        subscriber.created_at,
        subscriber.unsub_token,
        chart
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
        await recordBroadcastSend(subscriber.id, slug);
        sent++;
      } else {
        skipped++;
      }
    }

    console.log(`[cron:broadcast] ${slug}: sent=${sent} skipped=${skipped}`);
    totalSent += sent;
    totalSkipped += skipped;
  }

  console.log(`[cron:broadcast] Done: sent=${totalSent} skipped=${totalSkipped}`);
  return NextResponse.json({ ok: true, sent: totalSent, skipped: totalSkipped });
}
