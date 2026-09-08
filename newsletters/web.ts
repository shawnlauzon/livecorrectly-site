import { Marked } from 'marked';
import { getNewsletterSendDates } from '@/lib/db';
import { loadAllNewsletters, type RawNewsletter } from './loader';
import { hasWebPersonalization as checkWebPersonalization } from './personalizations/web';

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
  /** Whether this newsletter has a web personalization component */
  hasWebPersonalization: boolean;
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

/** Marked instance with default renderer (clean semantic HTML) */
const marked = new Marked();

/**
 * Render a RawNewsletter for web display.
 * Returns null if the newsletter has no slug (email-only issue).
 */
function renderForWeb(
  raw: RawNewsletter,
  publishedAt: string,
  published: boolean,
): WebNewsletter | null {
  if (!raw.slug) return null;

  const cleaned = replaceVariables(stripGreeting(raw.bodyMarkdown.trim()));
  const bodyHtml = marked.parse(cleaned) as string;
  const ps = raw.rawPs.map(p =>
    marked.parseInline(replaceVariables(p.trim())) as string,
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
    hasWebPersonalization: checkWebPersonalization(raw.number),
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
 */
export async function getWebNewsletter(slug: string): Promise<WebNewsletter | null> {
  const all = await getWebNewsletters();
  return all.find(n => n.slug === slug) ?? null;
}

/**
 * All published slugs — for generateStaticParams.
 */
export async function getAllSlugs(): Promise<string[]> {
  return (await getWebNewsletters()).map(n => n.slug);
}
