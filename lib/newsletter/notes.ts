import { getNewsletterNoteForDate, getNextNewsletterNote } from '@/lib/db';
import type { NewsletterNote } from '@/lib/db';
import { zonedDateString } from '@/lib/newsletter/cadence';

/**
 * The note for a send at `sendAt`: the one dated on that calendar day in the
 * publication's timezone, if any.
 */
export async function getNoteForSend(
  newsletterId: number,
  sendAt: Date,
  timezone: string,
): Promise<NewsletterNote | null> {
  return getNewsletterNoteForDate(newsletterId, zonedDateString(sendAt, timezone));
}

/**
 * The note an issue being written will most likely carry: the earliest one
 * dated today or later in the publication's timezone. Used by the editor preview.
 */
export async function getUpcomingNote(
  newsletterId: number,
  timezone: string,
  now: Date = new Date(),
): Promise<NewsletterNote | null> {
  return getNextNewsletterNote(newsletterId, zonedDateString(now, timezone));
}
