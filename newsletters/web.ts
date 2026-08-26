import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Marked } from 'marked';

export interface WebNewsletter {
  slug: string;
  number: number;
  /** Display title (from front-matter `subject`) */
  title: string;
  description: string;
  publishedAt: string;
  /** Semantic HTML rendered from markdown body */
  bodyHtml: string;
  /** Optional callout about email personalization; null if not set */
  personalizationNote: string | null;
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
function parseForWeb(raw: string, number: number): WebNewsletter | null {
  const { data, content: body } = matter(raw);

  const slug = typeof data.slug === 'string' ? data.slug : null;
  if (!slug) return null;

  const title = typeof data.subject === 'string' ? data.subject : '';
  const description = typeof data.description === 'string' ? data.description : '';
  const publishedAt = typeof data.publishedAt === 'string' ? data.publishedAt : '';
  const personalizationNote =
    typeof data.personalizationNote === 'string' ? data.personalizationNote : null;

  const cleaned = replaceVariables(stripGreeting(body.trim()));
  const bodyHtml = marked.parse(cleaned) as string;

  return { slug, number, title, description, publishedAt, bodyHtml, personalizationNote };
}

/** Directory containing newsletter markdown files */
const DIR = path.join(process.cwd(), 'newsletters');

/**
 * Check whether a newsletter's publishedAt date is today or in the past.
 */
function isPublished(publishedAt: string): boolean {
  if (!publishedAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pub = new Date(publishedAt + 'T00:00:00');
  return pub <= today;
}

/**
 * Load all newsletters that have a `slug` and a publishedAt date that is
 * today or earlier, sorted newest-first.
 */
export function getWebNewsletters(): WebNewsletter[] {
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

    const raw = fs.readFileSync(path.join(DIR, file), 'utf-8');
    const parsed = parseForWeb(raw, num);
    if (parsed && isPublished(parsed.publishedAt)) results.push(parsed);
  }

  // Newest first
  results.sort((a, b) => b.number - a.number);
  return results;
}

/**
 * Get a single newsletter by its slug.
 */
export function getWebNewsletter(slug: string): WebNewsletter | null {
  const all = getWebNewsletters();
  return all.find(n => n.slug === slug) ?? null;
}

/**
 * All published slugs — for generateStaticParams.
 */
export function getAllSlugs(): string[] {
  return getWebNewsletters().map(n => n.slug);
}
