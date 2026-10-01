import { describe, it, expect } from 'vitest';
import {
  nextRegularSendAt,
  zonedDateString,
} from '../lib/newsletter-cadence';

// Tuesdays at 06:47 Chicago
const cadence = { sendWeekday: 2, sendTime: '06:47', timezone: 'America/Chicago' };

describe('nextRegularSendAt', () => {
  it('returns the coming Tuesday when now is earlier in the week (CDT)', () => {
    // Thu 2026-10-01 13:00 CDT
    const next = nextRegularSendAt(cadence, new Date('2026-10-01T18:00:00Z'));
    expect(next?.toISOString()).toBe('2026-10-06T11:47:00.000Z');
  });

  it('returns today when it is Tuesday before the send time', () => {
    // Tue 2026-10-06 06:00 CDT
    const next = nextRegularSendAt(cadence, new Date('2026-10-06T11:00:00Z'));
    expect(next?.toISOString()).toBe('2026-10-06T11:47:00.000Z');
  });

  it('returns next week when it is Tuesday after the send time', () => {
    // Tue 2026-10-06 07:00 CDT
    const next = nextRegularSendAt(cadence, new Date('2026-10-06T12:00:00Z'));
    expect(next?.toISOString()).toBe('2026-10-13T11:47:00.000Z');
  });

  it('returns next week when now is exactly the send time', () => {
    const next = nextRegularSendAt(cadence, new Date('2026-10-06T11:47:00Z'));
    expect(next?.toISOString()).toBe('2026-10-13T11:47:00.000Z');
  });

  it('uses standard time after the fall DST change', () => {
    // DST ends Sun 2026-11-01; Tue 2026-11-03 06:47 CST = 12:47 UTC
    const next = nextRegularSendAt(cadence, new Date('2026-10-30T12:00:00Z'));
    expect(next?.toISOString()).toBe('2026-11-03T12:47:00.000Z');
  });

  it('uses daylight time after the spring DST change', () => {
    // DST starts Sun 2027-03-14; Tue 2027-03-16 06:47 CDT = 11:47 UTC
    const next = nextRegularSendAt(cadence, new Date('2027-03-12T12:00:00Z'));
    expect(next?.toISOString()).toBe('2027-03-16T11:47:00.000Z');
  });

  it('respects the timezone when the UTC date differs from the local date', () => {
    // Mon 2026-10-05 23:30 CDT = Tue 04:30 UTC — local day is still Monday
    const next = nextRegularSendAt(cadence, new Date('2026-10-06T04:30:00Z'));
    expect(next?.toISOString()).toBe('2026-10-06T11:47:00.000Z');
  });

  it('returns null when the cadence is not configured', () => {
    expect(nextRegularSendAt({ ...cadence, sendWeekday: null })).toBeNull();
    expect(nextRegularSendAt({ ...cadence, sendTime: null })).toBeNull();
  });

  it('accepts a seconds suffix from Postgres time values', () => {
    const next = nextRegularSendAt({ ...cadence, sendTime: '06:47:00' }, new Date('2026-10-01T18:00:00Z'));
    expect(next?.toISOString()).toBe('2026-10-06T11:47:00.000Z');
  });
});

describe('zonedDateString', () => {
  it('formats the local calendar date', () => {
    expect(zonedDateString(new Date('2026-10-06T04:30:00Z'), 'America/Chicago')).toBe('2026-10-05');
  });
});
