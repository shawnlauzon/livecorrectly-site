import { describe, it, expect } from 'vitest';
import { planAudience, SEGMENT_MIN_SIZE, autoSegmentName } from '../lib/newsletter/audience';
import type { NewsletterSegment } from '../lib/db';

function segment(id: number, createdAt: string): NewsletterSegment {
  return {
    id,
    newsletterId: 1,
    name: `seg${id}`,
    resendSegmentId: `resend-${id}`,
    nextIssue: 9,
    createdAt,
  };
}

describe('planAudience', () => {
  it('sends directly when fewer than SEGMENT_MIN_SIZE are due and no segment exists', () => {
    expect(planAudience({ dueCount: SEGMENT_MIN_SIZE - 1, segmentsAtIssue: [] })).toEqual({ kind: 'direct' });
    expect(planAudience({ dueCount: 1, segmentsAtIssue: [] })).toEqual({ kind: 'direct' });
  });

  it('creates a segment when SEGMENT_MIN_SIZE or more are due and no segment exists', () => {
    expect(SEGMENT_MIN_SIZE).toBe(10);
    expect(planAudience({ dueCount: SEGMENT_MIN_SIZE, segmentsAtIssue: [] })).toEqual({ kind: 'new-segment' });
  });

  it('uses the single existing segment regardless of due count', () => {
    const s = segment(4, '2026-09-21T17:38:31.589Z');
    expect(planAudience({ dueCount: 2, segmentsAtIssue: [s] })).toEqual({ kind: 'segment', segment: s });
  });

  it('merges multiple segments into the oldest', () => {
    const newer = segment(6, '2026-09-21T17:46:37.266Z');
    const oldest = segment(4, '2026-09-21T17:38:31.589Z');
    const newest = segment(7, '2026-10-01T00:00:00.000Z');
    expect(planAudience({ dueCount: 50, segmentsAtIssue: [newer, oldest, newest] })).toEqual({
      kind: 'merge',
      keep: oldest,
      remove: [newer, newest],
    });
  });
});

describe('autoSegmentName', () => {
  it('names the cohort by send date and starting issue', () => {
    expect(autoSegmentName('2026-10-06', 4)).toBe('2026-10-06 (from #4)');
  });
});
