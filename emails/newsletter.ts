import { Subscriber } from '@/lib/types/subscriber';
import { parseChartForEmail, type EmailChartData } from '@/lib/hd-chart/parse-for-email';
import { getNewsletterIssue } from './newsletter-loader';
import { renderNewsletterEmail } from './newsletter-template';
import { buildUnsubscribeUrl } from './send';

export { getNewsletterIssueCount, getMaxNewsletterIssueNumber, getNewsletterIssueNumbers } from './newsletter-loader';

/**
 * Build the rendered HTML for a newsletter step.
 * Step matches subscriber.next_step directly.
 * When chart data is available, Liquid conditionals and output tags are resolved.
 * Returns null if the newsletter doesn't exist.
 */
export async function getNewsletterHtml(
  step: number,
  subscriber: Subscriber,
  chart: ReturnType<typeof parseChartForEmail> | null,
  unsubscribeUrl: string
): Promise<string | null> {
  const newsletter = await getNewsletterIssue(
    step,
    subscriber.first_name,
    chart as EmailChartData | null,
    subscriber.id,
  );
  if (!newsletter) return null;

  return renderNewsletterEmail({
    bodyHtml: newsletter.bodyHtml,
    unsubscribeUrl,
    ps: newsletter.ps,
  });
}

/**
 * Get the subject line for a newsletter step, with firstName replacement.
 */
export async function getNewsletterSubject(step: number, firstName: string, subscriberId?: string): Promise<string> {
  const newsletter = await getNewsletterIssue(step, firstName, null, subscriberId);
  return newsletter?.subject ?? '';
}
