import * as React from 'react';
import { claimRepeatableEmailSend, setEmailSendResendId } from '@/lib/db';
import type { EmailStatus, Subscriber } from '@/lib/types/subscriber';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import {
  sendAdminNotification,
  sendTransactionalEmail,
  formatEmailRecipient,
} from '@/lib/email/send';
import { GuideConfirmation, subject as guideSubject } from '@/emails/guide-confirmation';
import {
  ConversationConfirmation,
  subject as conversationSubject,
} from '@/emails/conversation-confirmation';
import { findOffer, isPayFirst } from '@/lib/offers';

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

export type PurchaseResult =
  | 'sent'
  | 'already_confirmed'
  | 'not_deliverable'
  | 'failed'
  | 'unknown_offer';

/**
 * Handle a purchase reported by the site: tell Shawn (when `notifyAdmin`
 * is set) and email the buyer a confirmation. With no `offerId` it's the guide (a "your guide
 * is coming" note); with a pay-first offer's id it's that offer's confirmation,
 * carrying its scheduling link.
 *
 * The site never talks to Stripe, so `sessionId` is only what the redirect
 * carried. Stripe stays the record of who paid; the admin notice includes the
 * session id so it can be matched there before the guide is written.
 *
 * `notifyAdmin` is false for a brand-new subscriber, whose signup already sends
 * the "Guide purchase" notice.
 */
export async function confirmPurchase({
  subscriber,
  sessionId,
  notifyAdmin,
  offerId,
}: {
  subscriber: Subscriber;
  sessionId: string;
  notifyAdmin: boolean;
  offerId?: string;
}): Promise<PurchaseResult> {
  const offer = offerId === undefined ? undefined : findOffer(offerId);
  if (offerId !== undefined && (!offer || !isPayFirst(offer))) {
    console.error(`[purchase] Unknown or not pay-first offer "${offerId}"; nothing sent`);
    return 'unknown_offer';
  }
  const emailType = offerId === undefined ? GUIDE_CONFIRMATION_EMAIL_TYPE : `${offerId}_confirmation`;

  const claimed = await claimRepeatableEmailSend({
    subscriberId: subscriber.id,
    emailType,
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
      ...(offer && { offerName: offer.name }),
    }).catch((err) => {
      console.error(`[purchase] Failed to send ${offerId ?? 'guide'} admin notification for ${subscriber.email}:`, err);
    });
  }

  if (!DELIVERABLE_STATUSES.includes(subscriber.email_status)) return 'not_deliverable';

  const result = await sendTransactionalEmail({
    to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
    subject: offer ? conversationSubject : guideSubject,
    react: offer
      ? React.createElement(ConversationConfirmation, {
          firstName: subscriber.first_name,
          // isPayFirst guarantees a schedule URL.
          scheduleUrl: offer.scheduleUrl as string,
        })
      : React.createElement(GuideConfirmation, { firstName: subscriber.first_name }),
    emailLabel: emailType,
  });
  if (!result.success || !result.id) return 'failed';

  await setEmailSendResendId(subscriber.id, emailType, result.id);
  return 'sent';
}
