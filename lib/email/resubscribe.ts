import { reactivateUnsubscribed, recordEmailEvent } from '@/lib/db';
import { resubscribeContactInResend } from '@/lib/resend/contacts';

/**
 * Resubscribe someone who unsubscribed, on their own explicit click (the web
 * "Resubscribe" button). The `resubscribe` event is the record of that consent.
 * Returns false when the subscriber isn't currently unsubscribed.
 */
export async function resubscribe(subscriberId: string): Promise<boolean> {
  const reactivated = await reactivateUnsubscribed(subscriberId);
  if (!reactivated) return false;

  await recordEmailEvent({
    subscriberId,
    eventType: 'resubscribe',
    emailType: 'website',
  });
  console.log(`[resubscribe] Resubscribed subscriber ${subscriberId}`);

  // Sync to Resend so broadcasts include them again
  try {
    await resubscribeContactInResend(reactivated.email);
  } catch (err) {
    console.error(`[resubscribe] Failed to sync resubscribe to Resend for ${reactivated.email}:`, err);
  }
  return true;
}
