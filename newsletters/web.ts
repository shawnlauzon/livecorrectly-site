import { Liquid } from 'liquidjs';
import { getNewsletterSendDates } from '@/lib/db';
import { loadAllNewsletters, type RawNewsletter } from './loader';
import { resolveContactVars } from './resolve-contact-vars';
import { hasLiquidConditionals, buildLiquidContext } from './liquid-properties';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';

const liquidEngine = new Liquid();

export interface WebNewsletter {
  slug: string;
  number: number;
  /** Display title (from subject) */
  title: string;
  /** SEO-only description (used in metadata, not displayed on index) */
  description: string;
  /** Short teaser shown on the index page (from preview) */
  preview: string;
  /** First image URL from the body, or null if none */
  thumbnailUrl: string | null;
  publishedAt: string;
  /** Whether this newsletter has been sent (has a DB send record) */
  published: boolean;
  /** HTML rendered from editor content */
  bodyHtml: string;
  /** Postscripts (plain text) */
  ps: string[];
}

/** Extract the first <img> src from an HTML string, or null if none. */
function extractFirstImageUrl(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

/** Strip inline style="..." attributes so web CSS can style the content cleanly. */
function stripInlineStyles(html: string): string {
  return html.replace(/\s+style="[^"]*"/gi, '');
}

/** Slugify text into a URL-safe anchor id. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')            // strip HTML tags
    .replace(/[^a-z0-9 -]/g, '')       // strip non-alphanumeric except spaces/hyphens
    .replace(/\s+/g, '-')              // spaces → hyphens
    .replace(/-+/g, '-')               // collapse consecutive hyphens
    .replace(/^-|-$/g, '');            // trim leading/trailing hyphens
}

/** Add id attributes to h2/h3/h4 tags for anchor linking. */
function addHeadingIds(html: string): string {
  return html.replace(
    /<(h[2-4])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, content: string) => {
      // Don't overwrite an existing id
      if (/\bid=/.test(attrs)) return _match;
      const id = slugify(content);
      if (!id) return _match;
      return `<${tag}${attrs} id="${id}">${content}</${tag}>`;
    },
  );
}

/**
 * Resolve Resend default variables ({{{FIRST_NAME|there}}}, {{{RESEND_UNSUBSCRIBE_URL}}}, etc.)
 * for web display. Uses the fallback value when present, otherwise strips the variable.
 */
function resolveResendDefaultVars(html: string): string {
  return html.replace(
    /\{\{\{([A-Z_]+)(?:\|([^}]*))?\}\}\}/g,
    (_match, _key: string, fallback?: string) => fallback ?? '',
  );
}

/**
 * Render a RawNewsletter for web display.
 * Returns null if the newsletter has no slug (email-only issue).
 *
 * Processing pipeline:
 * 1. Start from editor HTML (bodyHtml)
 * 2. Strip inline style attributes for clean web CSS
 * 3. Add heading IDs for anchor linking
 * 4. Resolve Liquid conditionals if chart provided
 * 5. Resolve {{{contact.key}}} variables
 * 6. Resolve Resend default variables ({{{FIRST_NAME|there}}}, etc.)
 * 7. Extract thumbnail from original (unstyled-stripped) HTML
 */
async function renderForWeb(
  raw: RawNewsletter,
  publishedAt: string,
  published: boolean,
  chart?: EmailChartData | null,
): Promise<WebNewsletter | null> {
  if (!raw.slug) return null;

  // Extract thumbnail from original editor HTML (before style stripping)
  const thumbnailUrl = extractFirstImageUrl(raw.bodyHtml);

  let html = stripInlineStyles(raw.bodyHtml);
  html = addHeadingIds(html);

  // Resolve Liquid conditionals if present
  if (hasLiquidConditionals(html)) {
    // Escape double/triple-brace variables so Liquid doesn't choke on them.
    // Triple braces are Resend vars ({{{FIRST_NAME|there}}}), double braces
    // are legacy template vars ({{chartUrl}}) — neither are Liquid syntax.
    // Liquid only needs to see {% if %} / {% endif %} tags.
    // Single-pass regex: triple-brace first (greedy), then double-brace.
    const escaped = html.replace(
      /\{\{\{[^}]+\}\}\}|\{\{[^%}][^}]*\}\}/g,
      (match) => `{% raw %}${match}{% endraw %}`,
    );
    const context = chart ? buildLiquidContext(chart, 'web') : { mode: 'web' as const };
    html = await liquidEngine.parseAndRender(escaped, context);
  }

  html = resolveContactVars(html, chart ?? null);
  html = resolveResendDefaultVars(html);

  return {
    slug: raw.slug,
    number: raw.number,
    title: raw.subject,
    description: raw.description,
    preview: raw.preview,
    thumbnailUrl,
    publishedAt,
    published,
    bodyHtml: html,
    ps: raw.rawPs,
  };
}

/**
 * Load all newsletters that have a `slug` and have been sent (recorded in the DB),
 * sorted newest-first. In development, also includes unsent newsletters with
 * `published: false` so they can be previewed during authoring.
 */
export async function getWebNewsletters(): Promise<WebNewsletter[]> {
  const sendDates = await getNewsletterSendDates();
  const isDev = process.env.NODE_ENV === 'development';
  const all = await loadAllNewsletters();

  const results: WebNewsletter[] = [];
  for (const [num, raw] of all) {
    const sentAt = sendDates.get(num);

    if (!sentAt && !isDev) continue;

    try {
      const publishedAt = sentAt ?? new Date().toISOString();
      const parsed = await renderForWeb(raw, publishedAt, !!sentAt);
      if (parsed) results.push(parsed);
    } catch (error) {
      console.error(
        `Failed to render newsletter #${num} (${raw.slug ?? 'no-slug'}):`,
        error
      );
      // Continue processing other newsletters
    }
  }

  // Newest first
  results.sort((a, b) => b.number - a.number);
  return results;
}

/**
 * Get a single newsletter by its slug.
 * When chart is provided, conditional blocks are evaluated against it.
 */
export async function getWebNewsletter(
  slug: string,
  chart?: EmailChartData | null,
): Promise<WebNewsletter | null> {
  const sendDates = await getNewsletterSendDates();
  const isDev = process.env.NODE_ENV === 'development';
  const all = await loadAllNewsletters();

  for (const [num, raw] of all) {
    if (raw.slug !== slug) continue;
    const sentAt = sendDates.get(num);
    if (!sentAt && !isDev) return null;
    const publishedAt = sentAt ?? new Date().toISOString();
    try {
      return await renderForWeb(raw, publishedAt, !!sentAt, chart);
    } catch (error) {
      console.error(
        `Failed to render newsletter #${num} (${slug}):`,
        error
      );
      throw error; // Re-throw for single newsletter to show error page
    }
  }

  return null;
}

/**
 * All published slugs — for generateStaticParams.
 */
export async function getAllSlugs(): Promise<string[]> {
  return (await getWebNewsletters()).map((n) => n.slug);
}

/**
 * Build a map of old slug → current slug for all newsletters that declare old-slugs.
 * Used to issue permanent redirects when visitors hit a renamed URL.
 */
export async function getSlugRedirects(): Promise<Map<string, string>> {
  const all = await loadAllNewsletters();
  const redirects = new Map<string, string>();
  for (const [, raw] of all) {
    if (!raw.slug) continue;
    for (const old of raw.oldSlugs) {
      redirects.set(old, raw.slug);
    }
  }
  return redirects;
}
