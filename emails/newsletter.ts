import React from 'react';
import { Subscriber } from '@/lib/types/subscriber';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getNewsletter, getNewsletterCount } from './newsletter-loader';
import { NewsletterTemplate } from './newsletter-template';

export { getNewsletterCount, getMaxNewsletterNumber, getNewsletterNumbers } from './newsletter-loader';

/**
 * Build the React element for a newsletter step.
 * Step matches subscriber.next_step directly.
 * Returns null if the newsletter doesn't exist.
 */
export function getNewsletterEmail(
  step: number,
  subscriber: Subscriber,
  chart: ReturnType<typeof parseChartForEmail>,
  unsubscribeUrl: string
): React.ReactElement | null {
  const newsletter = getNewsletter(step, subscriber.first_name, subscriber.id);
  if (!newsletter) return null;

  const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
  const webUrl = newsletter.slug
    ? `${appUrl}/newsletter/${newsletter.slug}`
    : null;

  return React.createElement(NewsletterTemplate, {
    preview: newsletter.preview,
    bodyHtml: newsletter.bodyHtml,
    chart,
    unsubscribeUrl,
    number: newsletter.number,
    webUrl,
    ps: newsletter.ps
  });
}

/**
 * Get the subject line for a newsletter step, with firstName replacement.
 */
export function getNewsletterSubject(step: number, firstName: string, subscriberId?: string): string {
  const newsletter = getNewsletter(step, firstName, subscriberId);
  return newsletter?.subject ?? '';
}
