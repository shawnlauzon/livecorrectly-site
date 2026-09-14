import {
  loadNewsletterIssue,
  type RawNewsletterIssue,
} from '@/newsletters/loader';
import { replaceVariables as replaceVars, replaceChartSubpaths, replaceDesignedCta } from './template-variables';
import { resolveLiquid, resolveRelativeLinks } from '@/newsletters/resolve';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';

export {
  getNewsletterIssueCount,
  getMaxNewsletterIssueNumber,
  getNewsletterIssueNumbers,
  clearNewsletterIssueCache,
} from '@/newsletters/loader';

export interface NewsletterIssue {
  /** Newsletter number (from filename, matches next_step) */
  number: number;
  subject: string;
  preview: string;
  /** URL-safe slug for the web version, or null if email-only */
  slug: string | null;
  /** Email-styled HTML from the visual editor */
  bodyHtml: string;
  /** Postscripts rendered after the signature (plain text) */
  ps: string[];
}

/**
 * Render a RawNewsletterIssue into email-ready format.
 * Uses the editor's pre-rendered HTML directly; postscripts are plain text.
 */
function renderForEmail(raw: RawNewsletterIssue): NewsletterIssue {
  return {
    number: raw.number,
    subject: raw.subject,
    preview: raw.preview,
    slug: raw.slug,
    bodyHtml: raw.bodyHtml,
    ps: raw.rawPs.map(p => p.trim()),
  };
}

/**
 * Replace template variables in a rendered newsletter issue.
 * Builds a variable map from firstName/subscriberId and delegates to the shared replaceVariables().
 */
function replaceNewsletterVariables(newsletter: NewsletterIssue, firstName: string, subscriberId?: string): NewsletterIssue {
  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
  const chartUrl = subscriberId
    ? `${appUrl}/see-your-design/${subscriberId}?utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_${newsletter.number}`
    : '';
  const vars: Record<string, string> = {
    firstName,
    appUrl,
    chartUrl,
  };
  let bodyHtml = replaceVars(newsletter.bodyHtml, vars);
  bodyHtml = replaceChartSubpaths(bodyHtml, subscriberId, newsletter.number);
  bodyHtml = resolveRelativeLinks(bodyHtml, subscriberId, newsletter.number);
  if (subscriberId) {
    bodyHtml = replaceDesignedCta(bodyHtml, newsletter.slug, subscriberId, newsletter.number);
  }

  return {
    ...newsletter,
    subject: replaceVars(newsletter.subject, vars),
    preview: replaceVars(newsletter.preview, vars),
    bodyHtml,
    ps: newsletter.ps.map(p => replaceVars(p, vars)),
  };
}

/**
 * Get a newsletter issue by its step number (matches subscriber.next_step).
 * Returns null if the newsletter issue doesn't exist.
 * Replaces {{firstName}}, {{appUrl}}, and {{chartUrl}} template variables.
 *
 * When `chart` is provided, Liquid conditionals and output tags are resolved
 * for the subscriber's chart data before variable replacement.
 */
export async function getNewsletterIssue(
  step: number,
  firstName: string,
  chart?: EmailChartData | null,
  subscriberId?: string,
): Promise<NewsletterIssue | null> {
  const raw = await loadNewsletterIssue(step);
  if (!raw) return null;

  if (chart) {
    const resolvedHtml = await resolveLiquid(raw.bodyHtml, { chart, firstName });
    const ps = raw.rawPs.map(p => p.trim());

    const newsletter: NewsletterIssue = {
      number: raw.number,
      subject: raw.subject,
      preview: raw.preview,
      slug: raw.slug,
      bodyHtml: resolvedHtml,
      ps,
    };

    return replaceNewsletterVariables(newsletter, firstName, subscriberId);
  }

  return replaceNewsletterVariables(renderForEmail(raw), firstName, subscriberId);
}

/**
 * Get a newsletter issue without variable replacement (for testing / introspection).
 */
export async function getNewsletterIssueRaw(step: number): Promise<NewsletterIssue | null> {
  const raw = await loadNewsletterIssue(step);
  if (!raw) return null;
  return renderForEmail(raw);
}
