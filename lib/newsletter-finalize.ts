import { getDueUnfinalizedSchedules, finalizeNewsletterSchedule } from '@/lib/db';
import type { NewsletterSchedule } from '@/lib/db';
import { getResendClient } from '@/lib/resend-contacts';

/** Resend states in which a single scheduled email has not gone out yet. */
const PENDING_EMAIL_EVENTS = new Set(['scheduled', 'queued']);

/**
 * Ask Resend whether a schedule's send has completed.
 *
 * Completion is judged from Resend's own record of the send, not from
 * per-recipient email.sent webhooks: recipients who unsubscribed or were
 * suppressed before send time never produce one.
 */
async function isSendComplete(schedule: NewsletterSchedule): Promise<boolean> {
  const client = getResendClient();

  if (schedule.kind === 'direct') {
    for (const emailId of schedule.resend_email_ids ?? []) {
      const { data, error } = await client.emails.get(emailId);
      if (error || !data) {
        throw new Error(`Failed to fetch email ${emailId}: ${JSON.stringify(error)}`);
      }
      if (PENDING_EMAIL_EVENTS.has(data.last_event)) return false;
    }
    return true;
  }

  if (!schedule.broadcast_id) {
    throw new Error(`Broadcast schedule ${schedule.id} has no broadcast_id`);
  }
  const { data, error } = await client.broadcasts.get(schedule.broadcast_id);
  if (error || !data) {
    throw new Error(`Failed to fetch broadcast ${schedule.broadcast_id}: ${JSON.stringify(error)}`);
  }
  return data.status === 'sent';
}

/**
 * Finalize every schedule whose send time has passed and whose send Resend
 * reports as complete: mark it 'sent' and move its segment to the next issue.
 *
 * Safe to call concurrently and repeatedly (see finalizeNewsletterSchedule).
 * Called when the admin newsletter list loads and from the daily cron. Not
 * called per email.sent webhook: that would be one Resend API call per recipient.
 */
export async function finalizeDueSchedules(): Promise<{ finalized: number[] }> {
  const finalized: number[] = [];
  for (const schedule of await getDueUnfinalizedSchedules()) {
    try {
      if (!(await isSendComplete(schedule))) continue;
      const result = await finalizeNewsletterSchedule(schedule.id);
      if (result.finalized) {
        finalized.push(schedule.id);
        console.log(
          `[finalize] Newsletter #${schedule.newsletter_num} schedule ${schedule.id} → sent` +
            (result.segmentAdvanced
              ? `, segment ${schedule.newsletter_segment_id} → #${schedule.newsletter_num + 1}`
              : ''),
        );
      }
    } catch (err) {
      // One schedule's Resend lookup failing must not block the others; the
      // next webhook or cron run retries it.
      console.error(`[finalize] Failed to finalize schedule ${schedule.id}:`, err);
    }
  }
  return { finalized };
}
