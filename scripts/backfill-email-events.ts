/**
 * Backfill email_events from Resend broadcast data.
 *
 * Pulls broadcast recipient lists (opened/clicked) from the Resend API
 * and inserts corresponding events into email_events.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/backfill-email-events.ts
 *
 * Safe to re-run — events are inserted without dedup (Resend data is
 * point-in-time, so running twice will create duplicates; clear the table
 * first if re-running).
 */

import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const DATABASE_URL = process.env.DATABASE_URL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const resend = new Resend(RESEND_API_KEY);

const RATE_LIMIT_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Map email → subscriber_id from our database. */
async function buildEmailToSubscriberMap(): Promise<Map<string, string>> {
  const rows = await sql`SELECT id, email FROM subscribers`;
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set((row.email as string).toLowerCase(), row.id as string);
  }
  return map;
}

/** Map (subscriber_id, email_type) → email_send.id from our database. */
async function buildSendLookup(): Promise<Map<string, string>> {
  const rows = await sql`SELECT id, subscriber_id, email_type FROM email_sends`;
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(`${row.subscriber_id}:${row.email_type}`, row.id as string);
  }
  return map;
}

/**
 * Parse broadcast name into email_type.
 * Resend broadcast names follow our convention:
 *   "Newsletter #6" → "newsletter_6"
 *   "restart-notice-2026-09" → "broadcast_restart-notice-2026-09"
 */
function parseEmailType(broadcastName: string): string | null {
  const newsletterMatch = broadcastName.match(/Newsletter\s*#?(\d+)/i);
  if (newsletterMatch) return `newsletter_${newsletterMatch[1]}`;

  // Broadcast slugs — try to extract from the name
  const slugMatch = broadcastName.match(/^([a-z0-9-]+)$/i);
  if (slugMatch) return `broadcast_${slugMatch[1].toLowerCase()}`;

  return null;
}

async function main() {
  console.log('Building subscriber email map...');
  const emailToSubscriber = await buildEmailToSubscriberMap();
  console.log(`Found ${emailToSubscriber.size} subscribers`);

  console.log('Building email send lookup...');
  const sendLookup = await buildSendLookup();
  console.log(`Found ${sendLookup.size} send records`);

  // List all broadcasts from Resend
  console.log('Fetching broadcasts from Resend...');
  const { data: broadcastList, error: listError } = await resend.broadcasts.list();

  if (listError || !broadcastList) {
    console.error('Failed to list broadcasts:', listError);
    process.exit(1);
  }

  console.log(`Found ${broadcastList.data.length} broadcasts`);

  let totalEvents = 0;

  for (const broadcast of broadcastList.data) {
    const emailType = parseEmailType(broadcast.name);
    if (!emailType) {
      console.log(`  Skipping broadcast "${broadcast.name}" — could not parse email_type`);
      continue;
    }

    console.log(`\nProcessing: "${broadcast.name}" → ${emailType} (id=${broadcast.id})`);

    // Backfill resend_broadcast_id into email_sends
    await sql`
      UPDATE email_sends
      SET resend_broadcast_id = ${broadcast.id}
      WHERE email_type = ${emailType}
        AND resend_broadcast_id IS NULL
    `;

    // Fetch opened recipients
    for (const eventType of ['opened', 'clicked'] as const) {
      await sleep(RATE_LIMIT_MS);

      try {
        // Resend SDK types may not include this method yet — use raw fetch
        const response = await fetch(
          `https://api.resend.com/broadcasts/${broadcast.id}/recipients?type=${eventType}`,
          {
            headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
          },
        );

        if (!response.ok) {
          console.log(`  ${eventType}: API returned ${response.status}, skipping`);
          continue;
        }

        const data = await response.json();
        const recipients = data.data ?? [];
        console.log(`  ${eventType}: ${recipients.length} recipient(s)`);

        for (const recipient of recipients) {
          const email = (recipient.email as string)?.toLowerCase();
          if (!email) continue;

          const subscriberId = emailToSubscriber.get(email);
          if (!subscriberId) continue;

          const sendKey = `${subscriberId}:${emailType}`;
          const emailSendId = sendLookup.get(sendKey) ?? null;

          await sql`
            INSERT INTO email_events (
              subscriber_id, event_type, email_type, email_send_id,
              link_url, resend_email_id, occurred_at
            )
            VALUES (
              ${subscriberId},
              ${eventType === 'opened' ? 'open' : 'click'},
              ${emailType},
              ${emailSendId},
              ${null},
              ${null},
              ${broadcast.sent_at ?? new Date().toISOString()}
            )
          `;
          totalEvents++;
        }
      } catch (err) {
        console.error(`  Error fetching ${eventType} for broadcast ${broadcast.id}:`, err);
      }
    }
  }

  console.log(`\nDone! Inserted ${totalEvents} events.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
