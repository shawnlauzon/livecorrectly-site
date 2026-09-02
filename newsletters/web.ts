import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Marked } from 'marked';
import { getNewsletterSendDates } from '@/lib/db';

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
  publishedAt: string;
  /** Whether this newsletter has been sent (has a DB send record) */
  published: boolean;
  /** Semantic HTML rendered from markdown body */
  bodyHtml: string;
  /** Optional postscript (semantic HTML from markdown), or null if unset */
  ps: string | null;
}

const APP_URL = 'https://livecorrectly.com';

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
    .replace(/\{\{firstName\}\}/g, '');
}

/** Marked instance with default renderer (clean semantic HTML) */
const marked = new Marked();

/**
 * Parse a single newsletter markdown file for web display.
 * Returns null if the file has no `slug` (email-only issue).
 */
function parseForWeb(raw: string, number: number, publishedAt: string, published: boolean): WebNewsletter | null {
  const { data, content: body } = matter(raw);

  const slug = typeof data.slug === 'string' ? data.slug : null;
  if (!slug) return null;

  const title = typeof data.subject === 'string' ? data.subject : '';
  const description = typeof data.description === 'string' ? data.description : '';
  const preview = typeof data.preview === 'string' ? data.preview : '';
  const image = typeof data.image === 'string' ? data.image : null;

  const cleaned = replaceVariables(stripGreeting(body.trim()));
  const bodyHtml = marked.parse(cleaned) as string;
  const ps = typeof data.ps === 'string'
    ? (marked.parse(replaceVariables(data.ps.trim())) as string)
    : null;

  return { slug, number, title, description, preview, image, publishedAt, published, bodyHtml, ps };
}

/** Directory containing newsletter markdown files */
const DIR = path.join(process.cwd(), 'newsletters');

/**
 * Load all newsletters that have a `slug` and have been sent (recorded in the DB),
 * sorted newest-first. In development, also includes unsent newsletters with
 * `published: false` so they can be previewed during authoring.
 */
export async function getWebNewsletters(): Promise<WebNewsletter[]> {
  const sendDates = await getNewsletterSendDates();
  const isDev = process.env.NODE_ENV === 'development';

  let files: string[];
  try {
    files = fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort();
  } catch {
    // Directory doesn't exist — no newsletters available
    return [];
  }

  const results: WebNewsletter[] = [];
  for (const file of files) {
    const num = parseInt(file.replace('.md', ''), 10);
    if (isNaN(num) || num < 1) continue;

    const sentAt = sendDates.get(num);

    if (!sentAt && !isDev) continue;

    const filePath = path.join(DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');

    if (sentAt) {
      const parsed = parseForWeb(raw, num, sentAt, true);
      if (parsed) results.push(parsed);
    } else {
      // Dev-only: use file mtime as a fallback date
      const mtime = fs.statSync(filePath).mtime.toISOString();
      const parsed = parseForWeb(raw, num, mtime, false);
      if (parsed) results.push(parsed);
    }
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
