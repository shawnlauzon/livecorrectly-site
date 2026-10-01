/**
 * Weekly newsletter cadence: a weekday + time-of-day in the publication's
 * timezone (e.g. Tuesdays at 06:47 America/Chicago). The "regular" send time
 * is always derived from these, never stored as a timestamp, so it can't go stale.
 */

export interface WeeklyCadence {
  /** 0 = Sunday … 6 = Saturday */
  sendWeekday: number | null;
  /** "HH:MM" (24h) */
  sendTime: string | null;
  timezone: string;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function zonedParts(date: Date, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: WEEKDAY_INDEX[get('weekday')],
  };
}

/** Offset (ms) of `timezone` from UTC at the given instant. */
function tzOffsetMs(date: Date, timezone: string): number {
  const p = zonedParts(date, timezone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const truncated = Math.floor(date.getTime() / 60000) * 60000;
  return asUtc - truncated;
}

/** Convert a wall-clock time in `timezone` to a UTC instant (DST-aware). */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let result = guess - tzOffsetMs(new Date(guess), timezone);
  // Re-check with the offset at the candidate instant (handles DST boundaries)
  result = guess - tzOffsetMs(new Date(result), timezone);
  return new Date(result);
}

/** Calendar date ("YYYY-MM-DD") of an instant in `timezone`. */
export function zonedDateString(date: Date, timezone: string): string {
  const p = zonedParts(date, timezone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/**
 * The next regular send time strictly after `now`, or null when the cadence
 * isn't configured.
 */
export function nextRegularSendAt(cadence: WeeklyCadence, now: Date = new Date()): Date | null {
  if (cadence.sendWeekday == null || !cadence.sendTime) return null;
  const match = cadence.sendTime.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);

  // Walk forward day-by-day (8 days covers "today, but the time has passed")
  for (let i = 0; i <= 7; i++) {
    const day = zonedParts(new Date(now.getTime() + i * 24 * 60 * 60 * 1000), cadence.timezone);
    if (day.weekday !== cadence.sendWeekday) continue;
    const candidate = zonedTimeToUtc(day.year, day.month, day.day, hour, minute, cadence.timezone);
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  return null;
}

/** The regular send time `weeks` weeks after the next one (same wall-clock time). */
export function regularSendAtWeeksOut(
  cadence: WeeklyCadence,
  weeks: number,
  now: Date = new Date(),
): Date | null {
  const first = nextRegularSendAt(cadence, now);
  if (!first || weeks === 0) return first;
  const p = zonedParts(new Date(first.getTime() + weeks * 7 * 24 * 60 * 60 * 1000), cadence.timezone);
  const firstParts = zonedParts(first, cadence.timezone);
  return zonedTimeToUtc(p.year, p.month, p.day, firstParts.hour, firstParts.minute, cadence.timezone);
}
