import { Marked, Renderer, type Tokens } from 'marked';
import { getNewsletterSendDates } from '@/lib/db';
import { loadAllNewsletters, type RawNewsletter } from './loader';
import { processConditionals, hasMarkdownConditionals } from './conditionals';
import { resolveContactVars } from './resolve-contact-vars';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';

export interface WebNewsletter {
  slug: string;
  number: number;
  /** Display title (from front-matter `subject`) */
  title: string;
  /** SEO-only description (used in metadata, not displayed on index) */
  description: string;
  /** Short teaser shown on the index page (from front-matter `preview`) */
  preview: string;
  /** Filename in /public/newsletter/ (e.g. "matrix01.jpg"), or null if unset */
  image: string | null;
  /** Whether the detail page should render image as a hero above the body.
   *  False when the image already appears inline in the markdown body. */
  showHeroImage: boolean;
  publishedAt: string;
  /** Whether this newsletter has been sent (has a DB send record) */
  published: boolean;
  /** Semantic HTML rendered from markdown body */
  bodyHtml: string;
  /** Postscripts (semantic HTML from markdown) */
  ps: string[];
}

const APP_URL = 'https://www.livecorrectly.com';

/**
 * Strip the greeting line that starts with "Hey {{firstName}}," or
 * "Hi {{firstName}}," — this is email-only and shouldn't appear on the web.
 */
function stripGreeting(markdown: string): string {
  return markdown.replace(/^(Hey|Hi|Hello)\s+\{\{firstName\}\},?\s*\n+/im, '');
}

/**
 * Replace template variables with web-appropriate values.
 */
function replaceVariables(markdown: string): string {
  return markdown
    .replace(/\{\{appUrl\}\}/g, APP_URL)
    .replace(/\{\{chartUrl\}\}/g, '/see-your-design')
    .replace(/\{\{chart:\/[^}]*\}\}/g, '/see-your-design')
    .replace(/\{\{firstName\}\}/g, '')
    .replace(/^\{\{designed:.+?\}\}\s*$/gm, '');
}

/** Slugify heading text into a URL-safe anchor id. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[_*`~]/g, '')           // strip markdown emphasis chars
    .replace(/[^a-z0-9 -]/g, '')      // strip non-alphanumeric except spaces/hyphens
    .replace(/\s+/g, '-')             // spaces → hyphens
    .replace(/-+/g, '-')              // collapse consecutive hyphens
    .replace(/^-|-$/g, '');           // trim leading/trailing hyphens
}

/** Custom renderer that adds id attributes to headings for anchor linking. */
function createWebRenderer(): Renderer {
  const renderer = new Renderer();
  renderer.heading = function ({ tokens, depth }: Tokens.Heading): string {
    const text = this.parser.parseInline(tokens);
    const id = slugify(text.replace(/<[^>]*>/g, '')); // strip HTML tags before slugifying
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };
  return renderer;
}

/** Marked instance with heading-id renderer (clean semantic HTML) */
const marked = new Marked({ renderer: createWebRenderer() });

/**
 * Render a RawNewsletter for web display.
 * Returns null if the newsletter has no slug (email-only issue).
 */
function renderForWeb(
  raw: RawNewsletter,
  publishedAt: string,
  published: boolean,
  chart?: EmailChartData | null,
): WebNewsletter | null {
  if (!raw.slug) return null;

  const cleaned = replaceVariables(stripGreeting(raw.bodyMarkdown.trim()));
  const processed = processConditionals(cleaned, chart ?? null, 'web');
  const resolved = resolveContactVars(processed, chart ?? null);
  const bodyHtml = marked.parse(resolved) as string;
  const ps = raw.rawPs.map(
    (p) => marked.parseInline(replaceVariables(p.trim())) as string,
  );

  return {
    slug: raw.slug,
    number: raw.number,
    title: raw.subject,
    description: raw.description,
    preview: raw.preview,
    image: raw.rawImage,
    showHeroImage: raw.showHeroImage,
    publishedAt,
    published,
    bodyHtml,
    ps,
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
  const all = loadAllNewsletters();

  const results: WebNewsletter[] = [];
  for (const [num, raw] of all) {
    const sentAt = sendDates.get(num);

    if (!sentAt && !isDev) continue;

    const publishedAt = sentAt ?? new Date().toISOString();
    const parsed = renderForWeb(raw, publishedAt, !!sentAt);
    if (parsed) results.push(parsed);
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
  const all = loadAllNewsletters();

  for (const [num, raw] of all) {
    if (raw.slug !== slug) continue;
    const sentAt = sendDates.get(num);
    if (!sentAt && !isDev) return null;
    const publishedAt = sentAt ?? new Date().toISOString();
    return renderForWeb(raw, publishedAt, !!sentAt, chart);
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
export function getSlugRedirects(): Map<string, string> {
  const all = loadAllNewsletters();
  const redirects = new Map<string, string>();
  for (const [, raw] of all) {
    if (!raw.slug) continue;
    for (const old of raw.oldSlugs) {
      redirects.set(old, raw.slug);
    }
  }
  return redirects;
}
