import {
  loadNewsletter,
  parseRawNewsletter,
  type RawNewsletter,
} from '@/newsletters/loader';
import { emailMarked, replaceVariables as replaceVars, replaceChartSubpaths, replaceDesignedCta } from './markdown-renderer';

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
  /** URL-safe slug for the web version (from front-matter), or null if email-only */
  slug: string | null;
  /** Hero image filename (e.g. "lightning.jpg"), or null if unset or already in body */
  image: string | null;
  /** Email-styled HTML rendered from markdown body */
  bodyHtml: string;
  /** Postscripts rendered after the signature (markdown → inline-styled HTML) */
  ps: string[];
}

/**
 * Render a RawNewsletter into email-ready HTML.
 */
function renderForEmail(raw: RawNewsletter): Newsletter {
  const image = raw.showHeroImage ? raw.rawImage : null;
  const bodyHtml = emailMarked.parse(raw.bodyMarkdown.trim()) as string;
  const ps = raw.rawPs.map(p =>
    emailMarked.parseInline(p.trim()) as string,
  );

  return {
    number: raw.number,
    subject: raw.subject,
    preview: raw.preview,
    slug: raw.slug,
    image,
    bodyHtml,
    ps,
  };
}

/**
 * Parse a newsletter markdown file into structured data.
 * Exported for testing.
 */
export function parseNewsletter(content: string, number: number): Newsletter {
  return renderForEmail(parseRawNewsletter(content, number));
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
export function getNewsletter(step: number, firstName: string, subscriberId?: string): Newsletter | null {
  const raw = loadNewsletter(step);
  if (!raw) return null;
  return replaceNewsletterVariables(renderForEmail(raw), firstName, subscriberId);
}

/**
 * Get a newsletter without variable replacement (for testing / introspection).
 */
export function getNewsletterRaw(step: number): Newsletter | null {
  const raw = loadNewsletter(step);
  if (!raw) return null;
  return renderForEmail(raw);
}
