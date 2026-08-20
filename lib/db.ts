import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { EmailStatus, Subscriber } from './types/subscriber';
import type { ChartGroup, ChartRecord } from './types/chart';

let sql: NeonQueryFunction<false, false>;

function getDb(): NeonQueryFunction<false, false> {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

/**
 * Normalize old API field names in chart.group (th→theme, lg→lb).
 * Old charts stored before the API rename still have the old names in JSONB.
 */
function normalizeSubscriber(row: Subscriber): Subscriber {
  const group = row.chart?.chart?.group as ChartGroup | undefined;
  if (group) {
    if (!group.theme && group.th) {
      group.theme = group.th;
    }
    if (group.lb === undefined && group.lg !== undefined) {
      group.lb = group.lg;
    }
  }
  return row;
}

/**
 * Get all subscribers ordered by creation date (newest first)
 */
export async function getAllSubscribers(): Promise<Subscriber[]> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    ORDER BY created_at DESC
  `;
  return (result as Subscriber[]).map(normalizeSubscriber);
}

/**
 * Get a single subscriber by ID
 */
export async function getSubscriberById(
  id: string
): Promise<Subscriber | null> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE id = ${id}
  `;
  return result.length > 0 ? normalizeSubscriber(result[0] as Subscriber) : null;
}

/**
 * Check whether a subscriber with the given email already exists.
 * Returns the subscriber if found, null otherwise.
 */
export async function getSubscriberByEmail(
  email: string
): Promise<Subscriber | null> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE email = ${email}
  `;
  return result.length > 0 ? normalizeSubscriber(result[0] as Subscriber) : null;
}

/**
 * Create or update a subscriber (upsert on email).
 * On conflict, updates birth/chart data but preserves email pipeline state.
 */
export async function createSubscriber(data: {
  email: string;
  first_name: string;
  last_name: string | null;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  birth_place: string;
  chart: unknown;
}): Promise<Subscriber> {
  const db = getDb();
  const result = await db`
    INSERT INTO subscribers (
      email, first_name, last_name, birth_date, birth_time, time_unknown,
      birth_place, chart, last_engaged_at
    ) VALUES (
      ${data.email}, ${data.first_name}, ${data.last_name}, ${data.birth_date},
      ${data.birth_time}, ${data.time_unknown}, ${data.birth_place},
      ${JSON.stringify(data.chart)}, now()
    )
    ON CONFLICT (email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      birth_date = EXCLUDED.birth_date,
      birth_time = EXCLUDED.birth_time,
      time_unknown = EXCLUDED.time_unknown,
      birth_place = EXCLUDED.birth_place,
      chart = EXCLUDED.chart,
      last_engaged_at = now()
    RETURNING *
  `;
  return normalizeSubscriber(result[0] as Subscriber);
}

/**
 * Look up a subscriber by their unsubscribe token.
 * Used by the unsubscribe endpoint.
 */
export async function getSubscriberByUnsubToken(
  token: string
): Promise<Subscriber | null> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE unsub_token = ${token}
  `;
  return result.length > 0 ? normalizeSubscriber(result[0] as Subscriber) : null;
}

/**
 * Update a subscriber's email status (e.g. unsubscribed, bounced, complained).
 */
export async function updateEmailStatus(
  id: string,
  status: EmailStatus
): Promise<void> {
  const db = getDb();
  await db`
    UPDATE subscribers
    SET email_status = ${status},
        email_status_at = now()
    WHERE id = ${id}
  `;
}

/**
 * Get a subscriber by email, but only if they are active (can receive email).
 */
export async function getActiveSubscriberByEmail(
  email: string
): Promise<Subscriber | null> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE email = ${email}
      AND email_status = 'active'
  `;
  return result.length > 0 ? normalizeSubscriber(result[0] as Subscriber) : null;
}

/**
 * Get subscribers who are due for their next email.
 * Returns active subscribers where next_send_at <= today.
 */
export async function getDueSubscribers(): Promise<Subscriber[]> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE email_status = 'active'
      AND next_send_at <= CURRENT_DATE
    ORDER BY next_send_at ASC
  `;
  return (result as Subscriber[]).map(normalizeSubscriber);
}

/**
 * Advance a subscriber's email series to the next step and set the next send date.
 */
export async function advanceEmailSeries(
  id: string,
  nextStep: number,
  nextSendAt: string | null
): Promise<void> {
  const db = getDb();
  await db`
    UPDATE subscribers
    SET next_step = ${nextStep},
        next_send_at = ${nextSendAt}
    WHERE id = ${id}
  `;
}

/**
 * Look up a subscriber by email for bounce/complaint webhook processing.
 */
export async function getSubscriberByEmailForWebhook(
  email: string
): Promise<Subscriber | null> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE email = ${email}
  `;
  return result.length > 0 ? normalizeSubscriber(result[0] as Subscriber) : null;
}

/**
 * Replace a subscriber's chart JSONB blob with a fresh one.
 * Used by admin after refreshing a chart from the Maia API.
 */
export async function updateSubscriberChart(
  id: string,
  chart: ChartRecord
): Promise<Subscriber> {
  const db = getDb();
  const result = await db`
    UPDATE subscribers
    SET chart = ${JSON.stringify(chart)}
    WHERE id = ${id}
    RETURNING *
  `;
  if (result.length === 0) {
    throw new Error(`Subscriber ${id} not found`);
  }
  return normalizeSubscriber(result[0] as Subscriber);
}

/**
 * Update a subscriber's email series next step and next send date.
 * Used by admin to manually adjust pipeline position.
 */
export async function updateEmailSeries(
  id: string,
  nextStep: number,
  nextSendAt: string | null
): Promise<Subscriber> {
  const db = getDb();
  const result = await db`
    UPDATE subscribers
    SET next_step = ${nextStep},
        next_send_at = ${nextSendAt}
    WHERE id = ${id}
    RETURNING *
  `;
  return normalizeSubscriber(result[0] as Subscriber);
}

/**
 * Update last_engaged_at to now() for a subscriber.
 * Records the most recent proof of life (email click, chart page visit, etc.).
 */
export async function touchEngagement(id: string): Promise<void> {
  const db = getDb();
  await db`
    UPDATE subscribers
    SET last_engaged_at = now()
    WHERE id = ${id}
  `;
}

/**
 * Get active subscribers due for their next newsletter email.
 * Returns subscribers who have completed the welcome series and whose
 * next_send_at is today or earlier.
 */
export async function getDueNewsletterSubscribers(
  welcomeSeriesLength: number
): Promise<Subscriber[]> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE email_status = 'active'
      AND next_step > ${welcomeSeriesLength}
      AND next_send_at <= CURRENT_DATE
    ORDER BY next_send_at ASC
  `;
  return (result as Subscriber[]).map(normalizeSubscriber);
}

/**
 * Get active subscribers eligible for a broadcast who haven't received it yet.
 * Returns newest registrations first, limited to batch size.
 */
export async function getBroadcastRecipients(
  broadcastSlug: string,
  cutoffDate: string,
  limit: number
): Promise<Subscriber[]> {
  const db = getDb();
  const result = await db`
    SELECT s.* FROM subscribers s
    WHERE s.email_status = 'active'
      AND s.created_at < ${cutoffDate}
      AND NOT EXISTS (
        SELECT 1 FROM broadcast_sends bs
        WHERE bs.subscriber_id = s.id
          AND bs.broadcast_slug = ${broadcastSlug}
      )
    ORDER BY s.created_at DESC
    LIMIT ${limit}
  `;
  return (result as Subscriber[]).map(normalizeSubscriber);
}

/**
 * Record that a broadcast was sent to a subscriber.
 * Uses ON CONFLICT DO NOTHING for idempotency (safe if cron retries after interruption).
 */
export async function recordBroadcastSend(
  subscriberId: string,
  broadcastSlug: string
): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO broadcast_sends (subscriber_id, broadcast_slug)
    VALUES (${subscriberId}, ${broadcastSlug})
    ON CONFLICT (subscriber_id, broadcast_slug) DO NOTHING
  `;
}
