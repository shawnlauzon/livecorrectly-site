import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { EmailStatus, Subscriber } from './types/subscriber';

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
 * Get all subscribers ordered by creation date (newest first)
 */
export async function getAllSubscribers(): Promise<Subscriber[]> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    ORDER BY created_at DESC
  `;
  return result as Subscriber[];
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
  return result.length > 0 ? (result[0] as Subscriber) : null;
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
  return result.length > 0 ? (result[0] as Subscriber) : null;
}

/**
 * Create or update a subscriber (upsert on email).
 * On conflict, updates birth/chart data but preserves email pipeline state.
 */
export async function createSubscriber(data: {
  email: string;
  first_name: string;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  birth_place: string;
  chart: unknown;
}): Promise<Subscriber> {
  const db = getDb();
  const result = await db`
    INSERT INTO subscribers (
      email, first_name, birth_date, birth_time, time_unknown,
      birth_place, chart
    ) VALUES (
      ${data.email}, ${data.first_name}, ${data.birth_date},
      ${data.birth_time}, ${data.time_unknown}, ${data.birth_place},
      ${JSON.stringify(data.chart)}
    )
    ON CONFLICT (email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      birth_date = EXCLUDED.birth_date,
      birth_time = EXCLUDED.birth_time,
      time_unknown = EXCLUDED.time_unknown,
      birth_place = EXCLUDED.birth_place,
      chart = EXCLUDED.chart
    RETURNING *
  `;
  return result[0] as Subscriber;
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
  return result.length > 0 ? (result[0] as Subscriber) : null;
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
  return result.length > 0 ? (result[0] as Subscriber) : null;
}

/**
 * Get subscribers who are due for their next email.
 * Returns active subscribers where next_send_at <= now.
 */
export async function getDueSubscribers(): Promise<Subscriber[]> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE email_status = 'active'
      AND next_send_at <= now()
    ORDER BY next_send_at ASC
  `;
  return result as Subscriber[];
}

/**
 * Advance a subscriber's email series position and set the next send time.
 */
export async function advanceEmailSeries(
  id: string,
  newPosition: number,
  nextSendAt: string | null
): Promise<void> {
  const db = getDb();
  await db`
    UPDATE subscribers
    SET seq_position = ${newPosition},
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
  return result.length > 0 ? (result[0] as Subscriber) : null;
}
