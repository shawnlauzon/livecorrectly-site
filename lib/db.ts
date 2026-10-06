import { cache } from 'react';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { BirthInput, EmailStatus, Subscriber, EmailSend, EmailEvent, EmailEventType } from './types/subscriber';
import type { ChartGroup, ChartRecord } from './types/chart';
import type { RawNewsletterIssue, LiquidSectionMap } from '@/lib/newsletter/loader';

/** A redirect rule mapping a slug + chart property to a destination URL. */
export interface RedirectRule {
  id: string;
  slug: string;
  property_type: string;
  property_value: string;
  destination_url: string;
  created_at: string;
  updated_at: string;
}

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
 * Look up a subscriber by email, ignoring case (people don't retype it the way
 * they signed up). Returns null — and logs — if more than one row matches, since
 * the unique constraint is case-sensitive and the lookup would be ambiguous.
 */
export async function getSubscriberByEmailIgnoreCase(
  email: string
): Promise<Subscriber | null> {
  const db = getDb();
  const result = await db`
    SELECT * FROM subscribers
    WHERE lower(email) = lower(${email})
    LIMIT 2
  `;
  if (result.length > 1) {
    console.error(`[db] Multiple subscribers match ${email} ignoring case; refusing to pick one`);
    return null;
  }
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
 * Set an unsubscribed subscriber back to active. Only `unsubscribed` qualifies —
 * bounced/complained/suppressed addresses stay as they are. Returns the email
 * when reactivated, null otherwise.
 */
export async function reactivateUnsubscribed(
  id: string,
): Promise<{ email: string } | null> {
  const db = getDb();
  const rows = await db`
    UPDATE subscribers
    SET email_status = 'active',
        email_status_at = now()
    WHERE id = ${id} AND email_status = 'unsubscribed'
    RETURNING email
  `;
  return rows.length > 0 ? { email: rows[0].email as string } : null;
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
 * Claim a send of a repeatable email (one row per subscriber + type, so
 * `sent_at` holds the latest send). Atomic: returns false without claiming
 * when the previous send was less than `minIntervalMinutes` ago.
 */
export async function claimRepeatableEmailSend(params: {
  subscriberId: string;
  emailType: string;
  category: string;
  minIntervalMinutes: number;
}): Promise<boolean> {
  const db = getDb();
  const rows = await db`
    INSERT INTO email_sends (subscriber_id, email_type, category)
    VALUES (${params.subscriberId}, ${params.emailType}, ${params.category})
    ON CONFLICT (subscriber_id, email_type) DO UPDATE
      SET sent_at = now(), resend_email_id = NULL
      WHERE email_sends.sent_at < now() - make_interval(mins => ${params.minIntervalMinutes})
    RETURNING id
  `;
  return rows.length > 0;
}

/** Attach the Resend id to a claimed send so webhook events link back to it. */
export async function setEmailSendResendId(
  subscriberId: string,
  emailType: string,
  resendEmailId: string,
): Promise<void> {
  const db = getDb();
  await db`
    UPDATE email_sends SET resend_email_id = ${resendEmailId}
    WHERE subscriber_id = ${subscriberId} AND email_type = ${emailType}
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

/** Engagement summary for a single subscriber (used on admin list page). */
export interface EngagementSummary {
  lastEngagedAt: string;
  opens: number;
  clicks: number;
}

/**
 * Get engagement summary (last event, open count, click count) for each subscriber.
 * Returns a Map from subscriber ID to EngagementSummary.
 */
export async function getEngagementSummaryBatch(): Promise<Map<string, EngagementSummary>> {
  const db = getDb();
  const rows = await db`
    SELECT
      subscriber_id,
      MAX(occurred_at) AS last_engaged_at,
      COUNT(*) FILTER (WHERE event_type = 'open') AS open_count,
      COUNT(*) FILTER (WHERE event_type = 'click') AS click_count
    FROM email_events
    GROUP BY subscriber_id
  `;
  const map = new Map<string, EngagementSummary>();
  for (const row of rows) {
    map.set(row.subscriber_id as string, {
      lastEngagedAt: (row.last_engaged_at as Date).toISOString(),
      opens: Number(row.open_count),
      clicks: Number(row.click_count),
    });
  }
  return map;
}

/** Daily email activity for the admin email stats chart. */
export interface DailyActivity {
  date: string;
  sends: number;
  opens: number;
  clicks: number;
}

/**
 * Get daily email activity (sends, opens, clicks) grouped by day.
 * Counts unique email sends per metric per day.
 */
export async function getDailyEmailActivity(): Promise<DailyActivity[]> {
  const db = getDb();
  const rows = await db`
    SELECT
      date_trunc('day', es.sent_at)::date AS day,
      COUNT(DISTINCT es.id) AS sends,
      COUNT(DISTINCT CASE WHEN ee.event_type = 'open' THEN es.id END) AS opens,
      COUNT(DISTINCT CASE WHEN ee.event_type = 'click' THEN es.id END) AS clicks
    FROM email_sends es
    LEFT JOIN email_events ee
      ON ee.subscriber_id = es.subscriber_id
      AND ee.email_type = es.email_type
      AND ee.event_type IN ('open', 'click')
    WHERE es.resend_broadcast_id IS NOT NULL
      AND es.sent_at >= (
        SELECT MIN(occurred_at)::date
        FROM email_events
        WHERE event_type IN ('open', 'click')
      )
    GROUP BY date_trunc('day', es.sent_at)
    ORDER BY day
  `;
  return rows.map(row => ({
    date: (row.day as Date).toISOString().slice(0, 10),
    sends: Number(row.sends),
    opens: Number(row.opens),
    clicks: Number(row.clicks),
  }));
}

/** Per-email performance stats for the admin email stats endpoint. */
export interface EmailPerformanceStat {
  emailType: string;
  category: string;
  sent: number;
  opened: number;
  clicked: number;
}

/**
 * Get per-email-type performance stats (sent, opened, clicked counts).
 * Counts unique subscribers per metric to avoid inflating numbers from repeat events.
 */
export async function getEmailPerformanceStats(): Promise<EmailPerformanceStat[]> {
  const db = getDb();
  const rows = await db`
    SELECT
      es.email_type,
      es.category,
      COUNT(DISTINCT es.subscriber_id) AS sent,
      COUNT(DISTINCT CASE WHEN ee.event_type = 'open' THEN ee.subscriber_id END) AS opened,
      COUNT(DISTINCT CASE WHEN ee.event_type = 'click' THEN ee.subscriber_id END) AS clicked
    FROM email_sends es
    LEFT JOIN email_events ee
      ON ee.email_type = es.email_type
      AND ee.subscriber_id = es.subscriber_id
      AND ee.event_type IN ('open', 'click')
    WHERE es.resend_broadcast_id IS NOT NULL
    GROUP BY es.email_type, es.category
    HAVING COUNT(DISTINCT CASE WHEN ee.event_type = 'open' THEN ee.subscriber_id END) > 0
        OR COUNT(DISTINCT CASE WHEN ee.event_type = 'click' THEN ee.subscriber_id END) > 0
    ORDER BY MAX(es.sent_at) DESC
  `;
  return rows.map(row => ({
    emailType: row.email_type as string,
    category: row.category as string,
    sent: Number(row.sent),
    opened: Number(row.opened),
    clicked: Number(row.clicked),
  }));
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

/** Per-subscriber engagement data for a specific email type (used by admin drill-down). */
export interface EmailSubscriberEngagement {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  sentAt: string;
  openedAt: string | null;
  clickedAt: string | null;
  unsubscribedAt: string | null;
}

/**
 * Get subscribers who received a specific email type, with first open/click timestamps.
 * Used by the admin email stats drill-down to show who opened/clicked a given email.
 */
export async function getSubscribersForEmailType(emailType: string): Promise<EmailSubscriberEngagement[]> {
  const db = getDb();
  const rows = await db`
    SELECT
      s.id, s.first_name, s.last_name, s.email,
      es.sent_at,
      MIN(ee.occurred_at) FILTER (WHERE ee.event_type = 'open') AS opened_at,
      MIN(ee.occurred_at) FILTER (WHERE ee.event_type = 'click') AS clicked_at,
      MIN(ee.occurred_at) FILTER (WHERE ee.event_type = 'unsubscribe') AS unsubscribed_at
    FROM email_sends es
    JOIN subscribers s ON s.id = es.subscriber_id
    LEFT JOIN email_events ee
      ON ee.subscriber_id = es.subscriber_id
      AND ee.email_type = es.email_type
      AND ee.event_type IN ('open', 'click', 'unsubscribe')
    WHERE es.email_type = ${emailType}
    GROUP BY s.id, s.first_name, s.last_name, s.email, es.sent_at
    ORDER BY es.sent_at DESC
  `;
  return rows.map(row => ({
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string | null,
    email: row.email as string,
    sentAt: (row.sent_at as Date).toISOString(),
    openedAt: row.opened_at ? (row.opened_at as Date).toISOString() : null,
    clickedAt: row.clicked_at ? (row.clicked_at as Date).toISOString() : null,
    unsubscribedAt: row.unsubscribed_at ? (row.unsubscribed_at as Date).toISOString() : null,
  }));
}

// --- Newsletter engagement (for Liquid template conditionals) ---

/** Per-newsletter engagement flags for a subscriber (cumulative: clicked → opened → delivered). */
export interface NewsletterEngagementFlags {
  delivered: boolean;
  opened: boolean;
  clicked: boolean;
}

/**
 * Get newsletter engagement data for a single subscriber.
 * Returns a Map from newsletter number to cumulative engagement flags.
 * Used by transactional sends, previews, and web rendering.
 */
export async function getNewsletterEngagement(
  subscriberId: string,
): Promise<Map<number, NewsletterEngagementFlags>> {
  const db = getDb();

  // Get all newsletter sends for this subscriber
  const sendRows = await db`
    SELECT email_type FROM email_sends
    WHERE subscriber_id = ${subscriberId}
      AND email_type LIKE 'newsletter_%'
  `;

  // Get all newsletter open/click events for this subscriber
  const eventRows = await db`
    SELECT DISTINCT email_type, event_type FROM email_events
    WHERE subscriber_id = ${subscriberId}
      AND email_type LIKE 'newsletter_%'
      AND event_type IN ('open', 'click')
  `;

  const map = new Map<number, NewsletterEngagementFlags>();

  for (const row of sendRows) {
    const num = parseInt((row.email_type as string).replace('newsletter_', ''), 10);
    if (!isNaN(num)) {
      map.set(num, { delivered: true, opened: false, clicked: false });
    }
  }

  for (const row of eventRows) {
    const num = parseInt((row.email_type as string).replace('newsletter_', ''), 10);
    if (isNaN(num)) continue;
    if (!map.has(num)) {
      // Event exists without a send record — treat as delivered
      map.set(num, { delivered: true, opened: false, clicked: false });
    }
    const flags = map.get(num)!;
    if (row.event_type === 'open') {
      flags.opened = true;
    } else if (row.event_type === 'click') {
      flags.clicked = true;
      flags.opened = true; // clicked implies opened
    }
  }

  return map;
}

/**
 * Get newsletter engagement data for multiple subscribers in batch.
 * Returns a Map from subscriber ID to their per-newsletter engagement map.
 * Used by the broadcast schedule path to avoid N+1 queries.
 */
export async function getNewsletterEngagementBatch(
  subscriberIds: string[],
): Promise<Map<string, Map<number, NewsletterEngagementFlags>>> {
  if (subscriberIds.length === 0) return new Map();
  const db = getDb();

  const sendRows = await db`
    SELECT subscriber_id, email_type FROM email_sends
    WHERE subscriber_id = ANY(${subscriberIds})
      AND email_type LIKE 'newsletter_%'
  `;

  const eventRows = await db`
    SELECT DISTINCT subscriber_id, email_type, event_type FROM email_events
    WHERE subscriber_id = ANY(${subscriberIds})
      AND email_type LIKE 'newsletter_%'
      AND event_type IN ('open', 'click')
  `;

  const result = new Map<string, Map<number, NewsletterEngagementFlags>>();

  const getOrCreate = (sid: string): Map<number, NewsletterEngagementFlags> => {
    if (!result.has(sid)) result.set(sid, new Map());
    return result.get(sid)!;
  };

  for (const row of sendRows) {
    const sid = row.subscriber_id as string;
    const num = parseInt((row.email_type as string).replace('newsletter_', ''), 10);
    if (isNaN(num)) continue;
    const subMap = getOrCreate(sid);
    if (!subMap.has(num)) {
      subMap.set(num, { delivered: true, opened: false, clicked: false });
    }
  }

  for (const row of eventRows) {
    const sid = row.subscriber_id as string;
    const num = parseInt((row.email_type as string).replace('newsletter_', ''), 10);
    if (isNaN(num)) continue;
    const subMap = getOrCreate(sid);
    if (!subMap.has(num)) {
      subMap.set(num, { delivered: true, opened: false, clicked: false });
    }
    const flags = subMap.get(num)!;
    if (row.event_type === 'open') {
      flags.opened = true;
    } else if (row.event_type === 'click') {
      flags.clicked = true;
      flags.opened = true; // clicked implies opened
    }
  }

  return result;
}

// --- Newsletter schedules ---

/** A scheduled newsletter send tracked in newsletter_schedules. */
export interface NewsletterSchedule {
  id: number;
  newsletter_num: number;
  /** 'broadcast' = Resend broadcast to a segment; 'direct' = per-subscriber scheduled emails */
  kind: 'broadcast' | 'direct';
  broadcast_id: string | null;
  segment_id: string | null;
  /** The persistent newsletter_segments row this send targeted (broadcast only) */
  newsletter_segment_id: number | null;
  /** Resend email IDs for direct sends */
  resend_email_ids: string[] | null;
  scheduled_at: string;
  subscriber_count: number;
  status: 'scheduled' | 'sent';
  created_at: string;
}

/**
 * Insert a new newsletter schedule record.
 */
export async function insertNewsletterSchedule(data: {
  newsletterNum: number;
  kind: 'broadcast' | 'direct';
  broadcastId: string | null;
  segmentId: string | null;
  newsletterSegmentId: number | null;
  resendEmailIds: string[] | null;
  scheduledAt: Date;
  subscriberCount: number;
}): Promise<NewsletterSchedule> {
  const db = getDb();
  const rows = await db`
    INSERT INTO newsletter_schedules (
      newsletter_num, kind, broadcast_id, segment_id, newsletter_segment_id,
      resend_email_ids, scheduled_at, subscriber_count
    )
    VALUES (
      ${data.newsletterNum}, ${data.kind}, ${data.broadcastId}, ${data.segmentId},
      ${data.newsletterSegmentId}, ${data.resendEmailIds}, ${data.scheduledAt.toISOString()},
      ${data.subscriberCount}
    )
    RETURNING *
  `;
  return rows[0] as NewsletterSchedule;
}

/**
 * Get all newsletter schedules, newest first.
 */
export async function getNewsletterSchedules(): Promise<NewsletterSchedule[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM newsletter_schedules
    ORDER BY created_at DESC
  `;
  return rows as NewsletterSchedule[];
}

/**
 * Get the schedule for a specific newsletter number (most recent).
 */
export async function getScheduleForNewsletter(newsletterNum: number): Promise<NewsletterSchedule | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM newsletter_schedules
    WHERE newsletter_num = ${newsletterNum}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0] as NewsletterSchedule) : null;
}

/**
 * Delete a schedule row. Unscheduling removes the schedule entirely — there is
 * no 'cancelled' status.
 */
export async function deleteNewsletterSchedule(id: number): Promise<void> {
  const db = getDb();
  await db`
    DELETE FROM newsletter_schedules
    WHERE id = ${id}
  `;
}

/** Per-issue delivery stats for the admin newsletter list. */
export interface NewsletterReceivedStats {
  /** Distinct subscribers sent the issue (sends still pending are excluded) */
  receivedCount: number;
  /** Most recent completed send, ISO timestamp */
  lastSentAt: string | null;
}

/**
 * Received count and last-sent date per newsletter issue.
 *
 * email_sends rows are recorded when a send is scheduled, so rows belonging to
 * a still-'scheduled' schedule are excluded. Last sent prefers the scheduled_at
 * of 'sent' schedules (the real send time); older sends that predate
 * newsletter_schedules fall back to email_sends.sent_at.
 */
export async function getNewsletterReceivedStats(): Promise<Map<number, NewsletterReceivedStats>> {
  const db = getDb();
  const rows = await db`
    WITH delivered AS (
      SELECT e.email_type, e.subscriber_id, e.sent_at
      FROM email_sends e
      WHERE e.category = 'newsletter'
        AND NOT EXISTS (
          SELECT 1 FROM newsletter_schedules s
          WHERE s.status = 'scheduled'
            AND (s.broadcast_id = e.resend_broadcast_id
                 OR e.resend_email_id = ANY(s.resend_email_ids))
        )
    ),
    by_issue AS (
      SELECT substring(email_type FROM 12)::int AS num,  -- after 'newsletter_'
             COUNT(DISTINCT subscriber_id) AS received,
             MAX(sent_at) AS last_recorded
      FROM delivered
      WHERE email_type ~ '^newsletter_[0-9]+$'
      GROUP BY 1
    ),
    sent_schedules AS (
      SELECT newsletter_num AS num, MAX(scheduled_at) AS last_sent
      FROM newsletter_schedules
      WHERE status = 'sent'
      GROUP BY 1
    )
    SELECT b.num, b.received, COALESCE(ss.last_sent, b.last_recorded) AS last_sent_at
    FROM by_issue b
    LEFT JOIN sent_schedules ss ON ss.num = b.num
  `;
  const map = new Map<number, NewsletterReceivedStats>();
  for (const row of rows) {
    map.set(row.num as number, {
      receivedCount: Number(row.received),
      lastSentAt: row.last_sent_at ? (row.last_sent_at as Date).toISOString() : null,
    });
  }
  return map;
}

/**
 * Look up a newsletter schedule by its Resend broadcast ID.
 * Used by the webhook handler to map email.sent events back to a schedule.
 */
export async function getScheduleByBroadcastId(broadcastId: string): Promise<NewsletterSchedule | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM newsletter_schedules
    WHERE broadcast_id = ${broadcastId}
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0] as NewsletterSchedule) : null;
}

/**
 * Schedules still marked 'scheduled' whose send time has passed — candidates
 * for finalization once Resend confirms the send completed.
 */
export async function getDueUnfinalizedSchedules(): Promise<NewsletterSchedule[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM newsletter_schedules
    WHERE status = 'scheduled'
      AND scheduled_at <= now()
    ORDER BY scheduled_at
  `;
  return rows as NewsletterSchedule[];
}

/**
 * Atomically mark a schedule sent and move its segment to the next issue.
 *
 * Single statement so concurrent callers (many email.sent webhooks + the cron)
 * can't double-advance: only the caller whose UPDATE flips status from
 * 'scheduled' gets a row back, and the segment is set to newsletter_num + 1
 * only while it still points at newsletter_num.
 */
export async function finalizeNewsletterSchedule(
  scheduleId: number,
): Promise<{ finalized: boolean; segmentAdvanced: boolean }> {
  const db = getDb();
  const rows = await db`
    WITH marked AS (
      UPDATE newsletter_schedules
      SET status = 'sent'
      WHERE id = ${scheduleId} AND status = 'scheduled'
      RETURNING newsletter_segment_id, newsletter_num
    ),
    advanced AS (
      UPDATE newsletter_segments seg
      SET next_issue = marked.newsletter_num + 1
      FROM marked
      WHERE seg.id = marked.newsletter_segment_id
        AND seg.next_issue = marked.newsletter_num
      RETURNING seg.id
    )
    SELECT
      (SELECT count(*) FROM marked) AS marked,
      (SELECT count(*) FROM advanced) AS advanced
  `;
  return {
    finalized: Number(rows[0].marked) > 0,
    segmentAdvanced: Number(rows[0].advanced) > 0,
  };
}

/**
 * Delete email_sends records for an unscheduled broadcast.
 */
export async function deleteEmailSendsForBroadcast(
  broadcastId: string,
): Promise<void> {
  const db = getDb();
  await db`
    DELETE FROM email_sends
    WHERE resend_broadcast_id = ${broadcastId}
  `;
}

/**
 * Delete email_sends records for unscheduled direct newsletter emails.
 */
export async function deleteEmailSendsForResendEmails(
  resendEmailIds: string[],
): Promise<void> {
  if (resendEmailIds.length === 0) return;
  const db = getDb();
  await db`
    DELETE FROM email_sends
    WHERE resend_email_id = ANY(${resendEmailIds})
  `;
}

// --- Redirect rules ---

/**
 * Get all redirect rules for a given slug.
 * Used by the redirect handler to resolve a subscriber's destination.
 */
export async function getRedirectRulesForSlug(slug: string): Promise<RedirectRule[]> {
  const db = getDb();
  return await withRetry(async () => {
    const rows = await db`
      SELECT * FROM redirect_rules
      WHERE slug = ${slug}
    `;
    return rows as RedirectRule[];
  });
}

/**
 * Get all redirect rules, ordered by slug then property_type.
 * Used by the admin UI to list all rules.
 */
export async function getAllRedirectRules(): Promise<RedirectRule[]> {
  const db = getDb();
  return await withRetry(async () => {
    const rows = await db`
      SELECT * FROM redirect_rules
      ORDER BY slug, property_type, property_value
    `;
    return rows as RedirectRule[];
  });
}

/**
 * Create a new redirect rule.
 */
export async function createRedirectRule(data: {
  slug: string;
  property_type: string;
  property_value: string;
  destination_url: string;
}): Promise<RedirectRule> {
  const db = getDb();
  const rows = await withRetry(async () => {
    return await db`
      INSERT INTO redirect_rules (slug, property_type, property_value, destination_url)
      VALUES (${data.slug}, ${data.property_type}, ${data.property_value}, ${data.destination_url})
      RETURNING *
    `;
  });
  return rows[0] as RedirectRule;
}

/**
 * Update a redirect rule's destination URL.
 */
export async function updateRedirectRule(
  id: string,
  data: { destination_url: string },
): Promise<RedirectRule> {
  const db = getDb();
  const rows = await withRetry(async () => {
    return await db`
      UPDATE redirect_rules
      SET destination_url = ${data.destination_url},
          updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
  });
  if (rows.length === 0) {
    throw new Error(`Redirect rule ${id} not found`);
  }
  return rows[0] as RedirectRule;
}

/**
 * Delete a redirect rule by ID.
 */
export async function deleteRedirectRule(id: string): Promise<void> {
  const db = getDb();
  await withRetry(async () => {
    await db`
      DELETE FROM redirect_rules
      WHERE id = ${id}
    `;
  });
}

// --- Contact sync state ---

/** Snapshot of what was last synced to Resend for a subscriber. */
export interface ContactSyncState {
  subscriberId: string;
  syncedAt: string;
  syncedValues: Record<string, string>;
}

/**
 * Upsert contact sync state: merge values into existing synced_values JSONB.
 * On insert, creates a new row. On conflict, merges new values into the existing
 * snapshot (preserving keys not in this update) and refreshes synced_at.
 */
export async function upsertContactSyncState(
  subscriberId: string,
  values: Record<string, string>,
): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO contact_sync_state (subscriber_id, synced_values)
    VALUES (${subscriberId}, ${JSON.stringify(values)})
    ON CONFLICT (subscriber_id) DO UPDATE SET
      synced_values = contact_sync_state.synced_values || ${JSON.stringify(values)}::jsonb,
      synced_at = now()
  `;
}

/**
 * Get all contact sync states as a Map from subscriber ID to sync state.
 */
export async function getAllContactSyncStates(): Promise<Map<string, ContactSyncState>> {
  const db = getDb();
  const rows = await db`
    SELECT subscriber_id, synced_at, synced_values
    FROM contact_sync_state
  `;
  const map = new Map<string, ContactSyncState>();
  for (const row of rows) {
    map.set(row.subscriber_id as string, {
      subscriberId: row.subscriber_id as string,
      syncedAt: (row.synced_at as Date).toISOString(),
      syncedValues: row.synced_values as Record<string, string>,
    });
  }
  return map;
}

// --- Newsletters (DB-backed content) ---

/**
 * Map a newsletter_issues table row to the RawNewsletterIssue interface.
 */
function rowToRawNewsletterIssue(row: Record<string, unknown>): RawNewsletterIssue {
  return {
    number: row.number as number,
    newsletterId: row.newsletter_id as number,
    subject: row.subject as string,
    preview: (row.preview as string) ?? '',
    slug: (row.slug as string | null) ?? null,
    description: (row.description as string) ?? '',
    oldSlugs: (row.old_slugs as string[]) ?? [],
    rawPs: (row.postscripts as string[]) ?? [],
    bodyJson: row.body_json as unknown,
    bodyHtml: row.body_html as string,
    liquidSectionMap: (row.liquid_section_map as LiquidSectionMap | null) ?? null,
    updatedAt: row.updated_at ? (row.updated_at as Date).toISOString() : new Date().toISOString(),
    createdAt: (row.created_at as Date).toISOString(),
  };
}

/**
 * Get a single newsletter issue by number from the DB.
 */
export async function getDbNewsletterIssue(num: number): Promise<RawNewsletterIssue | null> {
  const db = getDb();
  const rows = await withRetry(() => db`
    SELECT * FROM newsletter_issues WHERE number = ${num}
  `);
  return rows.length > 0 ? rowToRawNewsletterIssue(rows[0]) : null;
}

/**
 * Get all newsletter issues from the DB, keyed by number.
 */
export async function getDbNewsletterIssues(): Promise<Map<number, RawNewsletterIssue>> {
  const db = getDb();
  const rows = await withRetry(() => db`
    SELECT * FROM newsletter_issues ORDER BY number
  `);
  const map = new Map<number, RawNewsletterIssue>();
  for (const row of rows) {
    const nl = rowToRawNewsletterIssue(row);
    map.set(nl.number, nl);
  }
  return map;
}

/**
 * Get sorted array of all newsletter issue numbers from the DB.
 */
export async function getDbNewsletterIssueNumbers(): Promise<number[]> {
  const db = getDb();
  const rows = await withRetry(() => db`
    SELECT number FROM newsletter_issues ORDER BY number
  `);
  return rows.map(r => r.number as number);
}

/**
 * Get a single newsletter issue by number with all columns.
 * Used by the editor API to load full content for editing.
 */
export async function getDbNewsletterIssueFull(num: number): Promise<RawNewsletterIssue | null> {
  const db = getDb();
  const rows = await withRetry(() => db`
    SELECT * FROM newsletter_issues WHERE number = ${num}
  `);
  return rows.length > 0 ? rowToRawNewsletterIssue(rows[0]) : null;
}

/**
 * Update a newsletter issue's liquid_section_map column.
 * Used by the schedule route to persist stable key assignments.
 */
export async function updateNewsletterIssueLiquidMap(
  num: number,
  map: LiquidSectionMap,
): Promise<void> {
  const db = getDb();
  await db`
    UPDATE newsletter_issues
    SET liquid_section_map = ${JSON.stringify(map)}::jsonb,
        updated_at = now()
    WHERE number = ${num}
  `;
}

/**
 * Update a newsletter issue's editable fields (metadata + editor content).
 * Used by the visual editor to save changes.
 *
 * `expected.updatedAt` is the optimistic lock; the editor drops it to
 * overwrite after a conflict. `expected.createdAt` identifies the issue the
 * editor loaded and is always checked: if reordering or deleting has put a
 * different issue at `num`, the save is refused with where the issue went
 * (`movedTo`, null if it no longer exists), never written over another issue.
 */
export async function updateNewsletterIssue(
  num: number,
  data: {
    subject?: string;
    preview?: string;
    slug?: string | null;
    description?: string;
    postscripts?: string[];
    bodyJson?: unknown;
    bodyHtml?: string;
  },
  expected: { updatedAt?: string; createdAt?: string } = {},
): Promise<{ updatedAt: string } | 'conflict' | { movedTo: number | null }> {
  const db = getDb();
  const rows = await db`
    UPDATE newsletter_issues SET
      subject = COALESCE(${data.subject ?? null}, subject),
      preview = COALESCE(${data.preview ?? null}, preview),
      slug = COALESCE(${data.slug !== undefined ? data.slug : null}, slug),
      description = COALESCE(${data.description ?? null}, description),
      postscripts = COALESCE(${data.postscripts ? JSON.stringify(data.postscripts) : null}::jsonb, postscripts),
      body_json = COALESCE(${data.bodyJson ? JSON.stringify(data.bodyJson) : null}::jsonb, body_json),
      body_html = COALESCE(${data.bodyHtml ?? null}, body_html),
      updated_at = now()
    WHERE number = ${num}
      ${expected.updatedAt ? db`AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', ${expected.updatedAt}::timestamptz)` : db``}
      ${expected.createdAt ? db`AND date_trunc('milliseconds', created_at) = date_trunc('milliseconds', ${expected.createdAt}::timestamptz)` : db``}
    RETURNING updated_at
  `;
  if (rows.length === 0) {
    if (expected.createdAt) {
      const current = await db`
        SELECT number FROM newsletter_issues
        WHERE date_trunc('milliseconds', created_at) = date_trunc('milliseconds', ${expected.createdAt}::timestamptz)
      `;
      const movedTo = current.length > 0 ? (current[0].number as number) : null;
      if (movedTo !== num) return { movedTo };
    }
    return 'conflict';
  }
  return { updatedAt: (rows[0].updated_at as Date).toISOString() };
}

/** TipTap JSON for an empty document (one blank paragraph). */
const EMPTY_TIPTAP_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

/**
 * Create a blank newsletter issue numbered one past the current highest issue.
 * Returns the new issue number.
 */
export async function createNewsletterIssue(newsletterId: number): Promise<number> {
  const db = getDb();
  const rows = await db`
    INSERT INTO newsletter_issues (number, newsletter_id, subject, body_json, body_html)
    SELECT COALESCE(MAX(number), 0) + 1, ${newsletterId}, 'Untitled',
           ${JSON.stringify(EMPTY_TIPTAP_DOC)}::jsonb, ''
    FROM newsletter_issues
    RETURNING number
  `;
  return rows[0].number as number;
}

/**
 * Delete an unsent newsletter issue and shift every later issue down by one,
 * so issue numbers stay contiguous (segments and subscribers advance by +1).
 *
 * Blocked when the issue — or any later issue that would be renumbered — has
 * sends or schedule rows, since those rows are keyed by issue number.
 */
export async function deleteNewsletterIssue(
  num: number,
): Promise<'deleted' | 'not_found' | { blocked: string }> {
  const db = getDb();

  const existing = await db`SELECT 1 FROM newsletter_issues WHERE number = ${num}`;
  if (existing.length === 0) return 'not_found';

  const referenced = await db`
    SELECT i.number,
      EXISTS (SELECT 1 FROM email_sends e WHERE e.email_type = 'newsletter_' || i.number) AS has_sends,
      EXISTS (SELECT 1 FROM newsletter_schedules s WHERE s.newsletter_num = i.number) AS has_schedules
    FROM newsletter_issues i
    WHERE i.number >= ${num}
    ORDER BY i.number
  `;
  for (const row of referenced) {
    if (row.has_sends || row.has_schedules) {
      const what = row.has_sends ? 'has been sent' : 'has schedule history';
      return {
        blocked: row.number === num
          ? `Newsletter #${num} ${what}`
          : `Later newsletter #${row.number} ${what}, so issues can't be renumbered`,
      };
    }
  }

  // Shift through negative numbers so the primary key never collides mid-update.
  await db.transaction([
    db`DELETE FROM newsletter_issues WHERE number = ${num}`,
    db`UPDATE newsletter_issues SET number = -number WHERE number > ${num}`,
    db`UPDATE newsletter_issues SET number = -number - 1, updated_at = now() WHERE number < 0`,
  ]);
  return 'deleted';
}

/**
 * Swap two unsent newsletter issues' numbers, reordering them. Numbers are
 * slots: subscribers' next_step and segments' next_issue stay on the number,
 * so whoever is due for #a gets the content that was #b.
 *
 * Blocked when either issue has sends or schedule rows (both keyed by number),
 * or when any issue's content has an engagement conditional on either number
 * (`newsletter_<n>.opened` etc.), which would silently point at the wrong issue.
 */
export async function swapNewsletterIssues(
  a: number,
  b: number,
): Promise<'swapped' | 'not_found' | { blocked: string }> {
  const db = getDb();

  const referenced = await db`
    SELECT i.number,
      EXISTS (SELECT 1 FROM email_sends e WHERE e.email_type = 'newsletter_' || i.number) AS has_sends,
      EXISTS (SELECT 1 FROM newsletter_schedules s WHERE s.newsletter_num = i.number) AS has_schedules
    FROM newsletter_issues i
    WHERE i.number IN (${a}, ${b})
    ORDER BY i.number
  `;
  if (referenced.length < 2) return 'not_found';
  for (const row of referenced) {
    if (row.has_sends) return { blocked: `Newsletter #${row.number} has been sent` };
    if (row.has_schedules) return { blocked: `Newsletter #${row.number} has schedule history` };
  }

  const conditionals = await db`
    SELECT number, strpos(content, ${`newsletter_${a}.`}) > 0 AS refs_a
    FROM (
      SELECT number,
        coalesce(body_json::text, '') || coalesce(body_html, '') ||
        postscripts::text || coalesce(liquid_section_map::text, '') AS content
      FROM newsletter_issues
    ) c
    WHERE strpos(content, ${`newsletter_${a}.`}) > 0
       OR strpos(content, ${`newsletter_${b}.`}) > 0
    ORDER BY number
    LIMIT 1
  `;
  if (conditionals.length > 0) {
    const row = conditionals[0];
    return {
      blocked: `Newsletter #${row.number} has a conditional on #${row.refs_a ? a : b}, so issues can't be reordered`,
    };
  }

  // Swap through negative numbers so the primary key never collides mid-update.
  await db.transaction([
    db`UPDATE newsletter_issues SET number = -number WHERE number IN (${a}, ${b})`,
    db`UPDATE newsletter_issues
       SET number = CASE number WHEN ${-a} THEN ${b}::int ELSE ${a}::int END, updated_at = now()
       WHERE number IN (${-a}, ${-b})`,
  ]);
  return 'swapped';
}

// --- Newsletter publication (schedule/cadence) ---

/** A newsletter publication entity with its weekly cadence settings. */
export interface NewsletterPublication {
  id: number;
  name: string;
  /** 0 = Sunday … 6 = Saturday */
  sendWeekday: number | null;
  /** "HH:MM" (24h) in `timezone` */
  sendTime: string | null;
  timezone: string;
}

function rowToNewsletterPublication(row: Record<string, unknown>): NewsletterPublication {
  return {
    id: row.id as number,
    name: row.name as string,
    sendWeekday: (row.send_weekday as number | null) ?? null,
    sendTime: row.send_time ? (row.send_time as string).slice(0, 5) : null,
    timezone: row.timezone as string,
  };
}

/**
 * Get all newsletter publications, ordered by ID.
 */
export async function getAllNewsletterPublications(): Promise<NewsletterPublication[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM newsletters ORDER BY id
  `;
  return rows.map(row => rowToNewsletterPublication(row));
}

/**
 * Get a newsletter publication by ID.
 */
export async function getNewsletterPublication(id: number): Promise<NewsletterPublication | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM newsletters WHERE id = ${id}
  `;
  return rows.length > 0 ? rowToNewsletterPublication(rows[0]) : null;
}

/**
 * Update a newsletter publication's weekly cadence settings.
 * Omitted fields are left unchanged.
 */
export async function updateNewsletterPublication(
  id: number,
  data: {
    sendWeekday?: number;
    sendTime?: string;
    timezone?: string;
  },
): Promise<NewsletterPublication> {
  const db = getDb();
  const rows = await db`
    UPDATE newsletters SET
      send_weekday = COALESCE(${data.sendWeekday ?? null}::int, send_weekday),
      send_time = COALESCE(${data.sendTime ?? null}::time, send_time),
      timezone = COALESCE(${data.timezone ?? null}, timezone),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) {
    throw new Error(`Newsletter publication ${id} not found`);
  }
  return rowToNewsletterPublication(rows[0]);
}

// --- Newsletter audience segments ---

/** A persistent audience segment for newsletter broadcasts. */
export interface NewsletterSegment {
  id: number;
  newsletterId: number;
  name: string;
  resendSegmentId: string;
  nextIssue: number;
  createdAt: string;
}

function rowToNewsletterSegment(row: Record<string, unknown>): NewsletterSegment {
  return {
    id: row.id as number,
    newsletterId: row.newsletter_id as number,
    name: row.name as string,
    resendSegmentId: row.resend_segment_id as string,
    nextIssue: row.next_issue as number,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

/**
 * Get all segments for a newsletter publication.
 */
export async function getNewsletterSegments(newsletterId: number): Promise<NewsletterSegment[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM newsletter_segments
    WHERE newsletter_id = ${newsletterId}
    ORDER BY created_at
  `;
  return rows.map(row => rowToNewsletterSegment(row));
}

/**
 * Get segments due for a specific issue number (next_issue matches).
 */
export async function getNewsletterSegmentsForIssue(
  newsletterId: number,
  issueNumber: number,
): Promise<NewsletterSegment[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM newsletter_segments
    WHERE newsletter_id = ${newsletterId}
      AND next_issue = ${issueNumber}
    ORDER BY created_at
  `;
  return rows.map(row => rowToNewsletterSegment(row));
}

/**
 * Create a new audience segment.
 */
export async function insertNewsletterSegment(data: {
  newsletterId: number;
  name: string;
  resendSegmentId: string;
  nextIssue: number;
}): Promise<NewsletterSegment> {
  const db = getDb();
  const rows = await db`
    INSERT INTO newsletter_segments (newsletter_id, name, resend_segment_id, next_issue)
    VALUES (${data.newsletterId}, ${data.name}, ${data.resendSegmentId}, ${data.nextIssue})
    RETURNING *
  `;
  return rowToNewsletterSegment(rows[0]);
}

/**
 * Delete a segment by ID.
 */
export async function deleteNewsletterSegment(segmentId: number): Promise<NewsletterSegment | null> {
  const db = getDb();
  const rows = await db`
    DELETE FROM newsletter_segments
    WHERE id = ${segmentId}
    RETURNING *
  `;
  return rows.length > 0 ? rowToNewsletterSegment(rows[0]) : null;
}

// --- Newsletter notes (dated) ---

/** A note shown above the issue body of any newsletter sent on `sendDate`. */
export interface NewsletterNote {
  id: number;
  newsletterId: number;
  /** "YYYY-MM-DD" in the publication's timezone */
  sendDate: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

function rowToNewsletterNote(row: Record<string, unknown>): NewsletterNote {
  return {
    id: row.id as number,
    newsletterId: row.newsletter_id as number,
    sendDate: row.send_date as string,
    body: row.body as string,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

/**
 * Get all notes for a newsletter publication, newest date first.
 * send_date is cast to text so the driver doesn't shift it through a JS Date.
 */
export async function getNewsletterNotes(newsletterId: number): Promise<NewsletterNote[]> {
  const db = getDb();
  const rows = await db`
    SELECT id, newsletter_id, send_date::text AS send_date, body, created_at, updated_at
    FROM newsletter_notes
    WHERE newsletter_id = ${newsletterId}
    ORDER BY send_date DESC
  `;
  return rows.map(row => rowToNewsletterNote(row));
}

/** Get a note by ID. */
export async function getNewsletterNote(id: number): Promise<NewsletterNote | null> {
  const db = getDb();
  const rows = await db`
    SELECT id, newsletter_id, send_date::text AS send_date, body, created_at, updated_at
    FROM newsletter_notes
    WHERE id = ${id}
  `;
  return rows.length > 0 ? rowToNewsletterNote(rows[0]) : null;
}

/** Get the note for a send date ("YYYY-MM-DD"), if any. */
export async function getNewsletterNoteForDate(
  newsletterId: number,
  sendDate: string,
): Promise<NewsletterNote | null> {
  const db = getDb();
  const rows = await db`
    SELECT id, newsletter_id, send_date::text AS send_date, body, created_at, updated_at
    FROM newsletter_notes
    WHERE newsletter_id = ${newsletterId} AND send_date = ${sendDate}::date
  `;
  return rows.length > 0 ? rowToNewsletterNote(rows[0]) : null;
}

/** The earliest note dated on or after `fromDate` ("YYYY-MM-DD"), if any. */
export async function getNextNewsletterNote(
  newsletterId: number,
  fromDate: string,
): Promise<NewsletterNote | null> {
  const db = getDb();
  const rows = await db`
    SELECT id, newsletter_id, send_date::text AS send_date, body, created_at, updated_at
    FROM newsletter_notes
    WHERE newsletter_id = ${newsletterId} AND send_date >= ${fromDate}::date
    ORDER BY send_date
    LIMIT 1
  `;
  return rows.length > 0 ? rowToNewsletterNote(rows[0]) : null;
}

/**
 * Create a note. Returns 'duplicate' when the publication already has a note
 * for that date (unique per newsletter + date).
 */
export async function insertNewsletterNote(data: {
  newsletterId: number;
  sendDate: string;
  body: string;
}): Promise<NewsletterNote | 'duplicate'> {
  const db = getDb();
  const rows = await db`
    INSERT INTO newsletter_notes (newsletter_id, send_date, body)
    VALUES (${data.newsletterId}, ${data.sendDate}::date, ${data.body})
    ON CONFLICT (newsletter_id, send_date) DO NOTHING
    RETURNING id, newsletter_id, send_date::text AS send_date, body, created_at, updated_at
  `;
  return rows.length > 0 ? rowToNewsletterNote(rows[0]) : 'duplicate';
}

/**
 * Update a note's date and body. Returns null if the note doesn't exist, or
 * 'duplicate' when another note already has the new date.
 */
export async function updateNewsletterNote(
  id: number,
  data: { sendDate: string; body: string },
): Promise<NewsletterNote | null | 'duplicate'> {
  const db = getDb();
  const clash = await db`
    SELECT 1 FROM newsletter_notes
    WHERE send_date = ${data.sendDate}::date
      AND newsletter_id = (SELECT newsletter_id FROM newsletter_notes WHERE id = ${id})
      AND id <> ${id}
  `;
  if (clash.length > 0) return 'duplicate';
  const rows = await db`
    UPDATE newsletter_notes
    SET send_date = ${data.sendDate}::date, body = ${data.body}, updated_at = now()
    WHERE id = ${id}
    RETURNING id, newsletter_id, send_date::text AS send_date, body, created_at, updated_at
  `;
  return rows.length > 0 ? rowToNewsletterNote(rows[0]) : null;
}

/** Delete a note by ID. Returns false if it didn't exist. */
export async function deleteNewsletterNote(id: number): Promise<boolean> {
  const db = getDb();
  const rows = await db`
    DELETE FROM newsletter_notes WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}
