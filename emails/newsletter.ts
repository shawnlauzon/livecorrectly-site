import React from 'react';
import { Subscriber } from '@/lib/types/subscriber';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getNewsletter } from './newsletter-loader';
import { NewsletterTemplate } from './newsletter-template';

export { getNewsletterCount, getMaxNewsletterNumber, getNewsletterNumbers } from './newsletter-loader';

/**
 * Build the React element for a newsletter step.
 * Step matches subscriber.next_step directly.
 * Returns null if the newsletter doesn't exist.
 */
export async function getNewsletterEmail(
  step: number,
  subscriber: Subscriber,
  chart: ReturnType<typeof parseChartForEmail> | null,
  unsubscribeUrl: string
): Promise<React.ReactElement | null> {
  const newsletter = await getNewsletter(step, subscriber.first_name, subscriber.id);
  if (!newsletter) return null;

  return React.createElement(NewsletterTemplate, {
    preview: newsletter.preview,
    bodyHtml: newsletter.bodyHtml,
    image: newsletter.image,
    chart,
    unsubscribeUrl,
    number: newsletter.number,
    ps: newsletter.ps,
  });
}

/**
 * Get the subject line for a newsletter step, with firstName replacement.
 */
export async function getNewsletterSubject(step: number, firstName: string, subscriberId?: string): Promise<string> {
  const newsletter = await getNewsletter(step, firstName, subscriberId);
  return newsletter?.subject ?? '';
}
