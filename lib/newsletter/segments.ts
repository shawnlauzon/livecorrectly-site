import { deleteNewsletterSegment } from '@/lib/db';
import type { NewsletterSegment } from '@/lib/db';
import { getResendClient } from '@/lib/resend/contacts';

/**
 * Add each email to a Resend segment. Returns how many adds succeeded;
 * failures are logged and skipped (e.g. the contact doesn't exist in Resend).
 */
export async function addEmailsToSegment(
  resendSegmentId: string,
  emails: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<number> {
  const client = getResendClient();
  let added = 0;
  for (let i = 0; i < emails.length; i++) {
    onProgress?.(i + 1, emails.length);
    const { error } = await client.contacts.segments.add({
      email: emails[i],
      segmentId: resendSegmentId,
    });
    if (error) {
      console.warn(`[segments] Failed to add ${emails[i]} to segment ${resendSegmentId}:`, error);
      continue;
    }
    added++;
  }
  return added;
}

/**
 * Remove a persistent audience segment from Resend and the database.
 * A Resend failure (e.g. already deleted) is logged but doesn't block the DB delete.
 */
export async function removeNewsletterSegment(segment: NewsletterSegment): Promise<void> {
  const client = getResendClient();
  const { error } = await client.segments.remove(segment.resendSegmentId);
  if (error) {
    console.warn(`[segments] Failed to delete Resend segment ${segment.resendSegmentId}:`, error);
  }
  await deleteNewsletterSegment(segment.id);
  console.log(
    `[segments] Deleted audience segment "${segment.name}" (DB: ${segment.id}, Resend: ${segment.resendSegmentId})`,
  );
}
