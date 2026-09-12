/**
 * Newsletter cadence configuration and date utilities.
 *
 * Newsletters are sent on a fixed weekly cadence (Wednesdays at 11:00 UTC),
 * matching the former cron schedule. When scheduling a newsletter broadcast,
 * the send date is computed from this cadence — no manual date picker needed.
 */

/** Weekly newsletter cadence (matches the former cron: "0 11 * * 3"). */
export const NEWSLETTER_CADENCE = {
  /** Day of week: 0 = Sunday, 3 = Wednesday */
  dayOfWeek: 3,
  /** Hour in UTC */
  hour: 11,
  /** Minute */
  minute: 0,
} as const;

/**
 * Get the next cadence date strictly after `from`.
 *
 * Finds the next occurrence of the configured day-of-week at the configured
 * time in UTC. If `from` is on the cadence day but before the cadence time,
 * that same day is returned.
 */
export function getNextCadenceDate(from: Date = new Date()): Date {
  const result = new Date(from);
  result.setUTCSeconds(0, 0);
  result.setUTCHours(NEWSLETTER_CADENCE.hour, NEWSLETTER_CADENCE.minute, 0, 0);

  const currentDay = from.getUTCDay();
  let daysUntil = (NEWSLETTER_CADENCE.dayOfWeek - currentDay + 7) % 7;

  if (daysUntil === 0) {
    // Same day — only use it if we haven't passed the cadence time yet
    if (from >= result) {
      daysUntil = 7;
    }
  }

  result.setUTCDate(result.getUTCDate() + daysUntil);
  return result;
}

/**
 * Compute `count` consecutive cadence dates starting from `from`.
 *
 * Used to build a timeline of expected send dates for the newsletters page.
 */
export function getNextCadenceDates(from: Date = new Date(), count: number): Date[] {
  const dates: Date[] = [];
  let cursor = from;
  for (let i = 0; i < count; i++) {
    const next = getNextCadenceDate(cursor);
    dates.push(next);
    // Move cursor 1ms past the cadence time so we skip to the next week
    cursor = new Date(next.getTime() + 1);
  }
  return dates;
}
