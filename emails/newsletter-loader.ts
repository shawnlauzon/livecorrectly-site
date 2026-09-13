import {
  loadNewsletter,
  type RawNewsletter,
} from '@/newsletters/loader';
import { emailMarked, replaceVariables as replaceVars, replaceChartSubpaths, replaceDesignedCta, resolveRelativeLinks } from './markdown-renderer';
import { resolveLiquid } from '@/newsletters/liquid-properties';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';

export {
  getNewsletterCount,
  getMaxNewsletterNumber,
  getNewsletterNumbers,
  clearNewsletterCache,
} from '@/newsletters/loader';

export interface Newsletter {
  /** Newsletter number (from filename, matches next_step) */
  number: number;
  subject: string;
  preview: string;
  /** URL-safe slug for the web version, or null if email-only */
  slug: string | null;
  /** Email-styled HTML from the visual editor */
  bodyHtml: string;
  /** Postscripts rendered after the signature (markdown → inline-styled HTML) */
  ps: string[];
}

/**
 * Render a RawNewsletter into email-ready HTML.
 * Uses the editor's pre-rendered HTML directly.
 */
function renderForEmail(raw: RawNewsletter): Newsletter {
  const ps = raw.rawPs.map(p =>
    emailMarked.parseInline(p.trim()) as string,
  );

  return {
    number: raw.number,
    subject: raw.subject,
    preview: raw.preview,
    slug: raw.slug,
    bodyHtml: raw.bodyHtml,
    ps,
  };
}

/**
 * Replace template variables in a rendered newsletter.
 * Builds a variable map from firstName/subscriberId and delegates to the shared replaceVariables().
 */
function replaceNewsletterVariables(newsletter: Newsletter, firstName: string, subscriberId?: string): Newsletter {
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
 * Get a newsletter by its step number (matches subscriber.next_step).
 * Returns null if the newsletter doesn't exist.
 * Replaces {{firstName}}, {{appUrl}}, and {{chartUrl}} template variables.
 */
export async function getNewsletter(step: number, firstName: string, subscriberId?: string): Promise<Newsletter | null> {
  const raw = await loadNewsletter(step);
  if (!raw) return null;
  return replaceNewsletterVariables(renderForEmail(raw), firstName, subscriberId);
}

/**
 * Get a newsletter with Liquid conditionals resolved for a specific subscriber.
 *
 * Used by admin manual sends where we have the subscriber's chart data and need
 * per-type content rendered. Liquid blocks are resolved before the newsletter
 * is returned.
 *
 * Falls back to getNewsletter() for newsletters without Liquid blocks.
 */
export async function getNewsletterWithChart(
  step: number,
  firstName: string,
  chart: EmailChartData,
  subscriberId?: string,
): Promise<Newsletter | null> {
  const raw = await loadNewsletter(step);
  if (!raw) return null;

  const resolvedHtml = await resolveLiquid(raw.bodyHtml, { chart, firstName });
  const ps = raw.rawPs.map(p => emailMarked.parseInline(p.trim()) as string);

  const newsletter: Newsletter = {
    number: raw.number,
    subject: raw.subject,
    preview: raw.preview,
    slug: raw.slug,
    bodyHtml: resolvedHtml,
    ps,
  };

  return replaceNewsletterVariables(newsletter, firstName, subscriberId);
}

/**
 * Get a newsletter without variable replacement (for testing / introspection).
 */
export async function getNewsletterRaw(step: number): Promise<Newsletter | null> {
  const raw = await loadNewsletter(step);
  if (!raw) return null;
  return renderForEmail(raw);
}
