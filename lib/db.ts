import { cache } from 'react';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { BirthInput, EmailStatus, Subscriber, EmailSend, EmailEvent, EmailEventType } from './types/subscriber';
import type { ChartGroup, ChartRecord } from './types/chart';

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

// --- Newsletter schedules ---

/** A scheduled newsletter broadcast tracked in newsletter_schedules. */
export interface NewsletterSchedule {
  id: number;
  newsletter_num: number;
  broadcast_id: string;
  segment_id: string | null;
  scheduled_at: string;
  subscriber_count: number;
  status: string; // 'scheduled' | 'sent' | 'cancelled'
  created_at: string;
}

/**
 * Insert a new newsletter schedule record.
 */
export async function insertNewsletterSchedule(data: {
  newsletterNum: number;
  broadcastId: string;
  segmentId: string | null;
  scheduledAt: Date;
  subscriberCount: number;
}): Promise<NewsletterSchedule> {
  const db = getDb();
  const rows = await db`
    INSERT INTO newsletter_schedules (newsletter_num, broadcast_id, segment_id, scheduled_at, subscriber_count)
    VALUES (${data.newsletterNum}, ${data.broadcastId}, ${data.segmentId}, ${data.scheduledAt.toISOString()}, ${data.subscriberCount})
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
 * Update the status of a newsletter schedule.
 */
export async function updateScheduleStatus(
  id: number,
  status: string,
): Promise<void> {
  const db = getDb();
  await db`
    UPDATE newsletter_schedules
    SET status = ${status}
    WHERE id = ${id}
  `;
}

/**
 * Get newsletter numbers that have been published (scheduled or sent).
 * Used by the cron to know which newsletters are safe to send to catch-up subscribers.
 */
export async function getPublishedNewsletterNumbers(): Promise<Set<number>> {
  const db = getDb();
  const rows = await db`
    SELECT DISTINCT newsletter_num
    FROM newsletter_schedules
    WHERE status IN ('scheduled', 'sent')
  `;
  return new Set(rows.map(r => r.newsletter_num as number));
}

/**
 * Get subscriber IDs that were included in a specific newsletter broadcast.
 * Used for rollback when cancelling a scheduled newsletter.
 */
export async function getSubscribersForNewsletterSchedule(
  newsletterNum: number,
  broadcastId: string,
): Promise<string[]> {
  const db = getDb();
  const rows = await db`
    SELECT subscriber_id FROM email_sends
    WHERE email_type = ${'newsletter_' + newsletterNum}
      AND resend_broadcast_id = ${broadcastId}
  `;
  return rows.map(r => r.subscriber_id as string);
}

/**
 * Roll back next_step for subscribers that were advanced for a cancelled broadcast.
 * Decrements next_step by 1 for all subscribers in the list.
 */
export async function rollBackNewsletterAdvancement(
  subscriberIds: string[],
  newsletterNum: number,
): Promise<number> {
  if (subscriberIds.length === 0) return 0;
  const db = getDb();
  // Only roll back if their current next_step is newsletterNum + 1
  // (they haven't been advanced further by another send)
  const result = await db`
    UPDATE subscribers
    SET next_step = ${newsletterNum}
    WHERE id = ANY(${subscriberIds})
      AND next_step = ${newsletterNum + 1}
    RETURNING id
  `;
  return result.length;
}

/**
 * Delete email_sends records for a cancelled broadcast.
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

