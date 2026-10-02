import type { ChartRecord, Cycles } from '@/lib/types/chart';

/** A solar return this many months out (or sooner) counts as "coming up". */
export const SOLAR_WINDOW_MONTHS = 3;

/** A large cycle this many months away, before or after now, counts as "near" (3.5 years). */
export const LARGE_CYCLE_WINDOW_MONTHS = 42;

/** The once-in-a-lifetime transits the engine reports in `chart.cycles`. */
export const LARGE_CYCLES: { key: keyof Cycles; name: string }[] = [
  { key: 'saturn', name: 'Saturn Return' },
  { key: 'chiron', name: 'Chiron Return' },
  { key: 'uranus', name: 'Uranus Opposition' },
  { key: 'secondSaturn', name: 'Second Saturn Return' },
];

export interface CycleDate {
  name: string;
  date: Date;
}

/** Next anniversary (UTC month/day) of the given timestamp strictly after `now`. */
export function getNextAnnualReturn(isoTimestamp: string, now: Date = new Date()): Date {
  const origin = new Date(isoTimestamp);
  const thisYear = now.getUTCFullYear();
  const candidate = new Date(
    Date.UTC(thisYear, origin.getUTCMonth(), origin.getUTCDate()),
  );
  if (candidate <= now) {
    candidate.setUTCFullYear(thisYear + 1);
  }
  return candidate;
}

/** All large-cycle dates in the chart, past and future, skipping missing/invalid values. */
export function getLargeCycleDates(chart: ChartRecord | null | undefined): CycleDate[] {
  const cycles = chart?.chart?.cycles;
  if (!cycles) return [];

  const result: CycleDate[] = [];
  for (const { key, name } of LARGE_CYCLES) {
    const value = cycles[key];
    if (!value) continue;
    const date = new Date(value);
    if (!isNaN(date.getTime())) result.push({ name, date });
  }
  return result;
}

/** Next solar return if it falls within `months` of `now`, else null. */
export function getUpcomingSolarReturn(
  chart: ChartRecord | null | undefined,
  now: Date = new Date(),
  months: number = SOLAR_WINDOW_MONTHS,
): Date | null {
  const birthUtc = chart?.meta?.birthData?.time?.utc;
  if (!birthUtc || isNaN(new Date(birthUtc).getTime())) return null;

  const next = getNextAnnualReturn(birthUtc, now);
  return next <= addUtcMonths(now, months) ? next : null;
}

function addUtcMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/** Large cycles within `months` of `now`, past or future, in date order. */
export function getNearbyLargeCycles(
  chart: ChartRecord | null | undefined,
  now: Date = new Date(),
  months: number = LARGE_CYCLE_WINDOW_MONTHS,
): CycleDate[] {
  const start = addUtcMonths(now, -months);
  const end = addUtcMonths(now, months);
  return getLargeCycleDates(chart)
    .filter(({ date }) => date >= start && date <= end)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** "Mar 5, 2027" — UTC so the calendar day matches the engine's timestamp. */
export function formatReturnDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "in 1 year, 2 months" / "3 months ago" / "today". */
export function formatRelativeDate(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const totalDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365.25);
  const remainingDays = totalDays - Math.floor(years * 365.25);
  const months = Math.floor(remainingDays / 30.44);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (parts.length === 0) {
    if (totalDays === 0) return 'today';
    parts.push(`${totalDays} ${totalDays === 1 ? 'day' : 'days'}`);
  }

  const label = parts.join(', ');
  return isPast ? `${label} ago` : `in ${label}`;
}
