import * as React from 'react';
import { claimRepeatableEmailSend, setEmailSendResendId } from '@/lib/db';
import type { EmailStatus, Subscriber } from '@/lib/types/subscriber';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import {
  sendAdminNotification,
  sendTransactionalEmail,
  formatEmailRecipient,
} from '@/lib/email/send';
import { GuideConfirmation, subject } from '@/emails/guide-confirmation';

/** email_type / Resend label for the "your guide is coming" message. */
export const GUIDE_CONFIRMATION_EMAIL_TYPE = 'guide_confirmation';

/**
 * One confirmation per subscriber per day: reloading the thank-you page, or
 * the form and the page both reporting the same purchase, sends nothing more.
 */
const MIN_INTERVAL_MINUTES = 24 * 60;

/**
 * Who can be emailed a confirmation. Unsubscribed people can — it's about
 * something they bought, not marketing. Bounced/complained/suppressed
 * addresses can't: mail won't arrive, or sending would hurt sender reputation.
 */
const DELIVERABLE_STATUSES: readonly EmailStatus[] = ['active', 'failed', 'unsubscribed'];

export type GuidePurchaseResult = 'sent' | 'already_confirmed' | 'not_deliverable' | 'failed';

/**
 * Handle a guide purchase reported by the site: tell Shawn (when `notifyAdmin`
 * is set) and email the buyer that the guide is on the way.
 *
 * The site never talks to Stripe, so `sessionId` is only what the redirect
 * carried. Stripe stays the record of who paid; the admin notice includes the
 * session id so it can be matched there before the guide is written.
 *
 * `notifyAdmin` is false for a brand-new subscriber, whose signup already sends
 * the "Guide purchase" notice.
 */
export async function confirmGuidePurchase({
  subscriber,
  sessionId,
  notifyAdmin,
}: {
  subscriber: Subscriber;
  sessionId: string;
  notifyAdmin: boolean;
}): Promise<GuidePurchaseResult> {
  const claimed = await claimRepeatableEmailSend({
    subscriberId: subscriber.id,
    emailType: GUIDE_CONFIRMATION_EMAIL_TYPE,
    category: 'transactional',
    minIntervalMinutes: MIN_INTERVAL_MINUTES,
  });
  if (!claimed) return 'already_confirmed';

  if (notifyAdmin) {
    const chartType = parseChartForEmail(subscriber.chart.chart).type;
    // Awaited so a serverless function doesn't end before it sends, but a
    // failure here must not stop the buyer's confirmation.
    await sendAdminNotification(subscriber, chartType, false, {
      sessionId,
      existingSubscriber: true,
    }).catch((err) => {
      console.error(`[guide] Failed to send admin notification for ${subscriber.email}:`, err);
    });
  }

  if (!DELIVERABLE_STATUSES.includes(subscriber.email_status)) return 'not_deliverable';

  const result = await sendTransactionalEmail({
    to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
    subject,
    react: React.createElement(GuideConfirmation, { firstName: subscriber.first_name }),
    emailLabel: GUIDE_CONFIRMATION_EMAIL_TYPE,
  });
  if (!result.success || !result.id) return 'failed';

  await setEmailSendResendId(subscriber.id, GUIDE_CONFIRMATION_EMAIL_TYPE, result.id);
  return 'sent';
}
