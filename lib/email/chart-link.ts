import * as React from 'react';
import { getSubscriberByEmailIgnoreCase, claimRepeatableEmailSend, setEmailSendResendId } from '@/lib/db';
import type { EmailStatus } from '@/lib/types/subscriber';
import { sendTransactionalEmail, formatEmailRecipient } from '@/lib/email/send';
import { PRODUCTION_URL } from '@/lib/site-url';
import { ChartLink, subject } from '@/emails/chart-link';

/** email_type / Resend label for the "email me my link" message. */
export const CHART_LINK_EMAIL_TYPE = 'chart_link';

/** At most one link per subscriber in this window, so the form can't be used to flood an inbox. */
const MIN_INTERVAL_MINUTES = 10;

/**
 * Who can request their link. Unsubscribed people can — they asked for this one
 * email, and it is transactional. Bounced/complained/suppressed addresses can't:
 * mail won't arrive, or sending again would hurt sender reputation.
 */
const ELIGIBLE_STATUSES: readonly EmailStatus[] = ['active', 'failed', 'unsubscribed'];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ChartLinkResult = 'sent' | 'not_found' | 'rate_limited' | 'failed';

/**
 * Email a returning subscriber their personalized links: the newsletter (back to
 * `slug` when they were reading an issue) and their chart. Callers must not reveal
 * the result to the visitor — it would tell them whether an email is subscribed.
 */
export async function requestChartLink({
  email,
  slug,
}: {
  email: string;
  slug?: string;
}): Promise<ChartLinkResult> {
  const subscriber = await getSubscriberByEmailIgnoreCase(email.trim());
  if (!subscriber || !ELIGIBLE_STATUSES.includes(subscriber.email_status)) return 'not_found';

  const claimed = await claimRepeatableEmailSend({
    subscriberId: subscriber.id,
    emailType: CHART_LINK_EMAIL_TYPE,
    category: 'transactional',
    minIntervalMinutes: MIN_INTERVAL_MINUTES,
  });
  if (!claimed) return 'rate_limited';

  const appUrl = process.env.APP_URL ?? PRODUCTION_URL;
  const utm = `utm_source=livecorrectly&utm_medium=email&utm_campaign=${CHART_LINK_EMAIL_TYPE}`;
  const newsletterPath = slug && SLUG_RE.test(slug) ? `/newsletter/${slug}` : '/newsletter';

  const result = await sendTransactionalEmail({
    to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
    subject,
    react: React.createElement(ChartLink, {
      firstName: subscriber.first_name,
      newsletterUrl: `${appUrl}${newsletterPath}?s=${subscriber.id}&${utm}`,
      chartUrl: `${appUrl}/see-your-design/${subscriber.id}?${utm}`,
    }),
    emailLabel: CHART_LINK_EMAIL_TYPE,
  });
  if (!result.success || !result.id) return 'failed';

  await setEmailSendResendId(subscriber.id, CHART_LINK_EMAIL_TYPE, result.id);
  return 'sent';
}
