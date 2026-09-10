import { cache } from 'react';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { BirthInput, EmailStatus, Subscriber, EmailSend, EmailEvent, EmailEventType } from './types/subscriber';
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
 * Retry delays in milliseconds for transient DB errors.
 * Two retries: 200ms, then 500ms.
 */
const RETRY_DELAYS = [200, 500];

/**
 * Check whether an error is a transient network/connection issue
 * that's worth retrying (timeouts, connection resets, fetch failures).
 */
function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message + (err.cause instanceof Error ? ' ' + err.cause.message : '');
  return /ETIMEDOUT|ECONNRESET|fetch failed|ECONNREFUSED|socket hang up/i.test(msg);
}

/**
 * Execute an async function with automatic retry on transient DB errors.
 * Non-transient errors are thrown immediately without retry.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransientError(err) || attempt === RETRY_DELAYS.length) {
        throw err;
      }
      const delay = RETRY_DELAYS[attempt];
      console.warn(
        `[db] Transient error (attempt ${attempt + 1}/${RETRY_DELAYS.length + 1}), retrying in ${delay}ms:`,
        err instanceof Error ? err.message : err,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // Unreachable, but satisfies TypeScript
  throw lastError;
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
  birth_input: BirthInput;
  chart: unknown;
}): Promise<Subscriber> {
  const db = getDb();
  const result = await db`
    INSERT INTO subscribers (
      email, first_name, last_name, birth_input, chart, next_step
    ) VALUES (
      ${data.email}, ${data.first_name}, ${data.last_name},
      ${JSON.stringify(data.birth_input)}, ${JSON.stringify(data.chart)}, 1
    )
    ON CONFLICT (email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      birth_input = EXCLUDED.birth_input,
      chart = EXCLUDED.chart
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
  status: EmailStatus,
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
      AND email_status IN ('active', 'failed')
  `;
  return result.length > 0 ? normalizeSubscriber(result[0] as Subscriber) : null;
}

/**
 * Get active subscribers due for their next welcome series email.
 * Returns subscribers with next_step between 1 and welcomeSeriesLength (inclusive).
 * Step 1 (welcome1) is normally sent at signup, but the cron acts as a safety net
 * for subscribers who got stuck (e.g. registration send failed, pre-migration data).
 */
export async function getWelcomeDueSubscribers(
  welcomeSeriesLength: number
): Promise<Subscriber[]> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE email_status IN ('active', 'failed')
      AND next_step >= 1
      AND next_step <= ${welcomeSeriesLength}
    ORDER BY created_at ASC
  `;
  return (result as Subscriber[]).map(normalizeSubscriber);
}

/**
 * Advance a subscriber's email series to the next step.
 */
export async function advanceEmailSeries(
  id: string,
  nextStep: number
): Promise<void> {
  const db = getDb();
  await db`
    UPDATE subscribers
    SET next_step = ${nextStep}
    WHERE id = ${id}
  `;
}

/**
 * Roll back a subscriber's email series by one step (floored at 1).
 * Called on email.failed so the missed email is retried on the next cron run.
 */
export async function rollBackEmailSeries(id: string): Promise<void> {
  const db = getDb();
  await db`
    UPDATE subscribers
    SET next_step = GREATEST(next_step - 1, 1)
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
 * Update a subscriber's email series next step.
 * Used by admin to manually adjust pipeline position.
 */
export async function updateEmailSeries(
  id: string,
  nextStep: number
): Promise<Subscriber> {
  const db = getDb();
  const result = await db`
    UPDATE subscribers
    SET next_step = ${nextStep}
    WHERE id = ${id}
    RETURNING *
  `;
  return normalizeSubscriber(result[0] as Subscriber);
}


/**
 * Get active subscribers due for their next welcome series resend.
 * Returns subscribers with welcome_resend_step between 1 and welcomeSeriesLength.
 */
export async function getWelcomeResendDueSubscribers(
  welcomeSeriesLength: number
): Promise<Subscriber[]> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE email_status IN ('active', 'failed')
      AND welcome_resend_step >= 1
      AND welcome_resend_step <= ${welcomeSeriesLength}
    ORDER BY created_at ASC
  `;
  return (result as Subscriber[]).map(normalizeSubscriber);
}

/**
 * Set or clear the welcome_resend_step column.
 * Pass null to clear (resend complete or not in progress).
 */
export async function setWelcomeResendStep(
  id: string,
  step: number | null
): Promise<void> {
  const db = getDb();
  await db`
    UPDATE subscribers
    SET welcome_resend_step = ${step}
    WHERE id = ${id}
  `;
}

/**
 * Get active subscribers due for their next newsletter email.
 * Returns subscribers who have completed the welcome series (next_step > welcomeSeriesLength).
 */
export async function getNewsletterDueSubscribers(
  welcomeSeriesLength: number
): Promise<Subscriber[]> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE email_status IN ('active', 'failed')
      AND next_step > ${welcomeSeriesLength}
    ORDER BY created_at ASC
  `;
  return (result as Subscriber[]).map(normalizeSubscriber);
}

/**
 * Get active subscribers who haven't received this broadcast yet.
 * Returns newest registrations first. Filtering (by created_at, next_step, etc.)
 * is done in the caller via a predicate from the broadcast's frontmatter config.
 */
export async function getBroadcastCandidates(
  broadcastSlug: string,
): Promise<Subscriber[]> {
  const db = getDb();
  const emailType = `broadcast_${broadcastSlug}`;
  const result = await db`
    SELECT s.* FROM subscribers s
    WHERE s.email_status IN ('active', 'failed')
      AND NOT EXISTS (
        SELECT 1 FROM email_sends es
        WHERE es.subscriber_id = s.id
          AND es.email_type = ${emailType}
      )
    ORDER BY s.created_at DESC
  `;
  return (result as Subscriber[]).map(normalizeSubscriber);
}

/**
 * Get send dates for all newsletters that have been sent.
 * Returns a Map from newsletter number to ISO timestamp string.
 * Queries email_sends grouped by email_type to find the earliest send per newsletter.
 *
 * Wrapped with React cache() so that within a single request
 * (e.g. generateMetadata + page component), the DB is hit only once.
 */
export const getNewsletterSendDates = cache(async (): Promise<Map<number, string>> => {
  const db = getDb();
  const rows = await withRetry(() => db`
    SELECT email_type, MIN(sent_at) AS sent_at
    FROM email_sends
    WHERE category = 'newsletter'
    GROUP BY email_type
  `);
  const map = new Map<number, string>();
  for (const row of rows) {
    // email_type is 'newsletter_6' → extract 6
    const match = (row.email_type as string).match(/^newsletter_(\d+)$/);
    if (match) {
      map.set(
        parseInt(match[1], 10),
        (row.sent_at as Date).toISOString()
      );
    }
  }
  return map;
});

/**
 * Attempt to acquire a per-day lock for a cron job.
 * Uses INSERT … ON CONFLICT DO NOTHING against the (cron_name, run_date) PK.
 * Returns true if the lock was acquired (first run today), false if already ran.
 */
export async function acquireCronLock(cronName: string): Promise<boolean> {
  const db = getDb();
  const result = await db`
    INSERT INTO cron_runs (cron_name, run_date)
    VALUES (${cronName}, CURRENT_DATE)
    ON CONFLICT DO NOTHING
    RETURNING *
  `;
  return result.length > 0;
}

// --- Unified email tracking ---

/**
 * Record that an email was sent to a subscriber.
 * Uses ON CONFLICT DO NOTHING for idempotency (safe if cron retries after interruption).
 */
export async function recordEmailSend(params: {
  subscriberId: string;
  emailType: string;
  category: string;
  resendEmailId?: string;
  resendBroadcastId?: string;
}): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO email_sends (subscriber_id, email_type, category, resend_email_id, resend_broadcast_id)
    VALUES (
      ${params.subscriberId},
      ${params.emailType},
      ${params.category},
      ${params.resendEmailId ?? null},
      ${params.resendBroadcastId ?? null}
    )
    ON CONFLICT (subscriber_id, email_type) DO NOTHING
  `;
}

/**
 * Record an email event (open, click, unsubscribe, manual engagement).
 */
export async function recordEmailEvent(params: {
  subscriberId: string;
  eventType: EmailEventType;
  emailType: string;
  emailSendId?: string;
  linkUrl?: string;
  resendEmailId?: string;
  occurredAt?: Date;
}): Promise<void> {
  // No-op on localhost — don't pollute event data during dev
  if (process.env.NODE_ENV === 'development') return;

  const db = getDb();
  const occurredAt = params.occurredAt ?? new Date();
  await db`
    INSERT INTO email_events (
      subscriber_id, event_type, email_type, email_send_id,
      link_url, resend_email_id, occurred_at
    )
    VALUES (
      ${params.subscriberId},
      ${params.eventType},
      ${params.emailType},
      ${params.emailSendId ?? null},
      ${params.linkUrl ?? null},
      ${params.resendEmailId ?? null},
      ${occurredAt.toISOString()}
    )
  `;
}

/**
 * Get all email sends for a subscriber, newest first.
 */
export async function getEmailSendsForSubscriber(subscriberId: string): Promise<EmailSend[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM email_sends
    WHERE subscriber_id = ${subscriberId}
    ORDER BY sent_at DESC
  `;
  return rows as EmailSend[];
}

/**
 * Get all email events for a subscriber, newest first.
 */
export async function getEmailEventsForSubscriber(subscriberId: string): Promise<EmailEvent[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM email_events
    WHERE subscriber_id = ${subscriberId}
    ORDER BY occurred_at DESC
  `;
  return rows as EmailEvent[];
}

/**
 * Get the most recent engagement timestamp for a subscriber.
 * Returns null if no events exist. Replaces the old last_engaged_at column.
 */
export async function getLastEngagementForSubscriber(subscriberId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db`
    SELECT MAX(occurred_at) AS last_engaged_at
    FROM email_events
    WHERE subscriber_id = ${subscriberId}
  `;
  if (rows.length === 0 || !rows[0].last_engaged_at) return null;
  return (rows[0].last_engaged_at as Date).toISOString();
}

/**
 * Look up the email_type for a Resend email ID (from webhook tags or send records).
 * Checks email_sends by resend_email_id.
 */
export async function lookupEmailSendByResendId(resendEmailId: string): Promise<EmailSend | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM email_sends
    WHERE resend_email_id = ${resendEmailId}
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0] as EmailSend) : null;
}

/**
 * Look up email sends by Resend broadcast ID.
 * A broadcast sends to many subscribers, so returns the email_type from any matching row.
 */
export async function lookupEmailTypeByBroadcastId(broadcastId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db`
    SELECT email_type FROM email_sends
    WHERE resend_broadcast_id = ${broadcastId}
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0].email_type as string) : null;
}

/**
 * Get the most recent email send for a subscriber.
 * Used for unsubscribe attribution when the exact email isn't known.
 */
export async function getMostRecentEmailSend(subscriberId: string): Promise<EmailSend | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM email_sends
    WHERE subscriber_id = ${subscriberId}
    ORDER BY sent_at DESC
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0] as EmailSend) : null;
}

/**
 * Get the last engagement timestamp for each subscriber (batch query for admin list).
 * Returns a Map from subscriber ID to ISO timestamp string.
 */
export async function getLastEngagementBatch(): Promise<Map<string, string>> {
  const db = getDb();
  const rows = await db`
    SELECT subscriber_id, MAX(occurred_at) AS last_engaged_at
    FROM email_events
    GROUP BY subscriber_id
  `;
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(
      row.subscriber_id as string,
      (row.last_engaged_at as Date).toISOString()
    );
  }
  return map;
}

/**
 * Get the unsubscribe email_type for each unsubscribed subscriber (batch query for admin list).
 * Returns a Map from subscriber ID to the email_type that triggered the unsubscribe.
 */
export async function getUnsubFromBatch(): Promise<Map<string, string>> {
  const db = getDb();
  // Get the most recent unsubscribe event per subscriber
  const rows = await db`
    SELECT DISTINCT ON (subscriber_id) subscriber_id, email_type
    FROM email_events
    WHERE event_type = 'unsubscribe'
    ORDER BY subscriber_id, occurred_at DESC
  `;
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.subscriber_id as string, row.email_type as string);
  }
  return map;
}

