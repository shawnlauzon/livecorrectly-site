import { describe, it, expect } from 'vitest';
import type { ChartRecord } from '@/lib/types/chart';
import {
  formatRelativeDate,
  formatReturnDate,
  getLargeCycleDates,
  getNextAnnualReturn,
  getNearbyLargeCycles,
  getUpcomingSolarReturn,
} from '@/lib/returns';

const NOW = new Date('2026-10-02T12:00:00Z');

function makeChart(opts: {
  birthUtc?: string;
  cycles?: Partial<Record<'saturn' | 'chiron' | 'uranus' | 'secondSaturn', string>>;
}): ChartRecord {
  return {
    meta: { birthData: { time: { utc: opts.birthUtc } } },
    chart: { cycles: opts.cycles },
  } as unknown as ChartRecord;
}

describe('getNextAnnualReturn', () => {
  it('returns this year when the anniversary is still ahead', () => {
    expect(getNextAnnualReturn('1985-11-20T08:00:00Z', NOW).toISOString()).toBe('2026-11-20T00:00:00.000Z');
  });

  it('rolls to next year when the anniversary has passed', () => {
    expect(getNextAnnualReturn('1985-03-05T08:00:00Z', NOW).toISOString()).toBe('2027-03-05T00:00:00.000Z');
  });
});

describe('getUpcomingSolarReturn', () => {
  it('includes a solar return inside the 3-month window', () => {
    const chart = makeChart({ birthUtc: '1990-12-15T10:00:00Z' });
    expect(getUpcomingSolarReturn(chart, NOW)?.toISOString()).toBe('2026-12-15T00:00:00.000Z');
  });

  it('excludes a solar return beyond the 3-month window', () => {
    const chart = makeChart({ birthUtc: '1990-01-15T10:00:00Z' });
    expect(getUpcomingSolarReturn(chart, NOW)).toBeNull();
  });

  it('handles the window wrapping into next year', () => {
    const december = new Date('2026-12-01T00:00:00Z');
    const chart = makeChart({ birthUtc: '1990-02-10T10:00:00Z' });
    expect(getUpcomingSolarReturn(chart, december)?.toISOString()).toBe('2027-02-10T00:00:00.000Z');
  });

  it('excludes a birthday earlier this year (next one is ~a year away)', () => {
    const chart = makeChart({ birthUtc: '1990-09-01T10:00:00Z' });
    expect(getUpcomingSolarReturn(chart, NOW)).toBeNull();
  });

  it('returns null with no chart or birth time', () => {
    expect(getUpcomingSolarReturn(null, NOW)).toBeNull();
    expect(getUpcomingSolarReturn(makeChart({}), NOW)).toBeNull();
  });
});

describe('getNearbyLargeCycles', () => {
  it('returns cycles within 3.5 years before or after now, in date order', () => {
    const chart = makeChart({
      cycles: {
        saturn: '2023-05-01T00:00:00Z', // ~3.4 years ago
        uranus: '2030-03-01T00:00:00Z', // ~3.4 years ahead
        chiron: '2027-01-15T00:00:00Z', // ahead
        secondSaturn: '2045-01-01T00:00:00Z', // far ahead
      },
    });
    expect(getNearbyLargeCycles(chart, NOW)).toEqual([
      { name: 'Saturn Return', date: new Date('2023-05-01T00:00:00Z') },
      { name: 'Chiron Return', date: new Date('2027-01-15T00:00:00Z') },
      { name: 'Uranus Opposition', date: new Date('2030-03-01T00:00:00Z') },
    ]);
  });

  it('excludes cycles just outside the 3.5-year window on either side', () => {
    const chart = makeChart({
      cycles: {
        saturn: '2023-04-01T00:00:00Z', // just over 3.5 years ago
        uranus: '2030-04-03T00:00:00Z', // just over 3.5 years ahead
      },
    });
    expect(getNearbyLargeCycles(chart, NOW)).toEqual([]);
  });

  it('skips invalid and missing cycle dates', () => {
    const chart = makeChart({ cycles: { saturn: 'not a date', chiron: '' } });
    expect(getLargeCycleDates(chart)).toEqual([]);
    expect(getNearbyLargeCycles(null, NOW)).toEqual([]);
  });
});

describe('formatting', () => {
  it('formats the UTC calendar day', () => {
    expect(formatReturnDate(new Date('2027-03-05T00:00:00Z'))).toBe('Mar 5, 2027');
  });

  it('describes future, past, and same-day dates relative to now', () => {
    expect(formatRelativeDate(new Date('2027-12-15T12:00:00Z'), NOW)).toBe('in 1 year, 2 months');
    expect(formatRelativeDate(new Date('2026-07-01T12:00:00Z'), NOW)).toBe('3 months ago');
    expect(formatRelativeDate(new Date('2026-10-12T12:00:00Z'), NOW)).toBe('in 10 days');
    expect(formatRelativeDate(new Date('2026-10-02T18:00:00Z'), NOW)).toBe('today');
  });
});
