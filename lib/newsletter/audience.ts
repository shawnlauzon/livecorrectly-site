import type { NewsletterSegment } from '@/lib/db';

/**
 * Smallest cohort that gets its own persistent segment. Smaller groups of due
 * subscribers with no segment are sent the issue directly (one scheduled email
 * each) and are found again by next_step for the following issue.
 */
export const SEGMENT_MIN_SIZE = 10;

/**
 * How an issue's audience is reached when it is scheduled.
 *
 * - merge:       2+ segments are on this issue → fold the rest into `keep` (the oldest)
 * - segment:     exactly one segment → broadcast to it (due stragglers are added to it)
 * - new-segment: no segment, enough due subscribers → create a persistent segment
 * - direct:      no segment, too few due subscribers → individual scheduled emails
 */
export type AudiencePlan =
  | { kind: 'merge'; keep: NewsletterSegment; remove: NewsletterSegment[] }
  | { kind: 'segment'; segment: NewsletterSegment }
  | { kind: 'new-segment' }
  | { kind: 'direct' };

export function planAudience(opts: {
  dueCount: number;
  segmentsAtIssue: NewsletterSegment[];
}): AudiencePlan {
  const segments = [...opts.segmentsAtIssue].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  if (segments.length > 1) {
    return { kind: 'merge', keep: segments[0], remove: segments.slice(1) };
  }
  if (segments.length === 1) {
    return { kind: 'segment', segment: segments[0] };
  }
  return opts.dueCount >= SEGMENT_MIN_SIZE ? { kind: 'new-segment' } : { kind: 'direct' };
}

/** Display name for an auto-created cohort segment, e.g. "2026-10-06 (from #4)". */
export function autoSegmentName(sendDate: string, newsletterNumber: number): string {
  return `${sendDate} (from #${newsletterNumber})`;
}
