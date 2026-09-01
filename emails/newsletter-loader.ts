import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Marked, Renderer, type Tokens } from 'marked';

export interface Newsletter {
  /** Newsletter number (from filename, matches next_step) */
  number: number;
  subject: string;
  preview: string;
  /** URL-safe slug for the web version (from front-matter), or null if email-only */
  slug: string | null;
  /** Email-styled HTML rendered from markdown body */
  bodyHtml: string;
}

/**
 * Custom marked renderer that adds inline styles for email client compatibility.
 * Email clients strip <style> blocks and ignore CSS classes, so every element
 * needs inline styles.
 *
 * Marked v18 passes full token objects to renderer methods. Inline content
 * (paragraphs, headings, strong, em, etc.) must call this.parser.parseInline()
 * to render child tokens into HTML strings.
 */
function createEmailRenderer(): Renderer {
  const renderer = new Renderer();

  renderer.paragraph = function ({ tokens }: Tokens.Paragraph): string {
    const text = this.parser.parseInline(tokens);
    return `<p style="margin:0 0 16px 0;font-size:16px;line-height:24px;color:#4A4A4A">${text}</p>\n`;
  };

  renderer.heading = function ({ tokens, depth }: Tokens.Heading): string {
    const text = this.parser.parseInline(tokens);
    if (depth === 2) {
      return `<h2 style="margin:24px 0 8px 0;font-size:20px;font-weight:bold;color:#221B3D">${text}</h2>\n`;
    }
    if (depth === 3) {
      return `<h3 style="margin:20px 0 8px 0;font-size:18px;font-weight:bold;color:#221B3D">${text}</h3>\n`;
    }
    return `<h${depth} style="margin:16px 0 8px 0;font-weight:bold;color:#221B3D">${text}</h${depth}>\n`;
  };

  renderer.link = function ({ href, tokens }: Tokens.Link): string {
    const text = this.parser.parseInline(tokens);
    return `<a href="${href}" style="color:#6A4BD6;text-decoration:underline">${text}</a>`;
  };

  renderer.list = function (token: Tokens.List): string {
    let body = '';
    for (const item of token.items) {
      body += this.listitem(item);
    }
    const tag = token.ordered ? 'ol' : 'ul';
    return `<${tag} style="margin:0 0 16px 0;padding-left:24px;font-size:16px;line-height:24px;color:#4A4A4A">${body}</${tag}>\n`;
  };

  renderer.listitem = function (item: Tokens.ListItem): string {
    const text = this.parser.parse(item.tokens);
    return `<li style="margin-bottom:8px">${text}</li>\n`;
  };

  renderer.hr = function (): string {
    return `<hr style="border:none;border-top:1px solid #E6E1F4;margin:24px 0" />\n`;
  };

  renderer.image = function ({ href, text }: Tokens.Image): string {
    return `<img src="${href}" alt="${text}" style="max-width:100%;height:auto;display:block;margin:16px 0;border-radius:8px" />\n`;
  };

  renderer.strong = function ({ tokens }: Tokens.Strong): string {
    const text = this.parser.parseInline(tokens);
    return `<strong style="font-weight:bold;color:#221B3D">${text}</strong>`;
  };

  renderer.em = function ({ tokens }: Tokens.Em): string {
    const text = this.parser.parseInline(tokens);
    return `<em>${text}</em>`;
  };

  renderer.blockquote = function ({ tokens }: Tokens.Blockquote): string {
    const text = this.parser.parse(tokens);
    return `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #6A4BD6;color:#4A4A4A;font-style:italic">${text}</blockquote>\n`;
  };

  return renderer;
}

const marked = new Marked({ renderer: createEmailRenderer() });

/**
 * Parse a newsletter markdown file into structured data.
 * Exported for testing.
 */
export function parseNewsletter(content: string, number: number): Newsletter {
  const { data, content: body } = matter(content);

  const subject = typeof data.subject === 'string' ? data.subject : '';
  const preview = typeof data.preview === 'string' ? data.preview : '';
  const slug = typeof data.slug === 'string' ? data.slug : null;
  const bodyHtml = marked.parse(body.trim()) as string;

  return { number, subject, preview, slug, bodyHtml };
}

/** Cached newsletters loaded from disk, keyed by number (matches next_step) */
let cache: Map<number, Newsletter> | null = null;

/**
 * Load all newsletters from emails/newsletters/*.md.
 * In production, results are cached for the process lifetime.
 * In development, files are re-read on every call so edits are reflected immediately.
 */
function loadAll(): Map<number, Newsletter> {
  if (cache && process.env.NODE_ENV === 'production') return cache;

  cache = new Map();
  const dir = path.join(process.cwd(), 'newsletters');

  let files: string[];
  try {
    files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
  } catch {
    // Directory doesn't exist — no newsletters available
    return cache;
  }

  for (const file of files) {
    const num = parseInt(file.replace('.md', ''), 10);
    if (isNaN(num) || num < 1) continue;

    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    cache.set(num, parseNewsletter(raw, num));
  }

  return cache;
}

/**
 * Replace template variables: {{firstName}}, {{appUrl}}, {{chartUrl}}.
 */
function replaceVariables(newsletter: Newsletter, firstName: string, subscriberId?: string): Newsletter {
  const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
  const chartUrl = subscriberId
    ? `${appUrl}/see-your-design/${subscriberId}?utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_${newsletter.number}`
    : '';
  const rewrite = (s: string) =>
    s.replace(/\{\{firstName\}\}/g, firstName)
     .replace(/\{\{appUrl\}\}/g, appUrl)
     .replace(/\{\{chartUrl\}\}/g, chartUrl);
  return {
    ...newsletter,
    subject: rewrite(newsletter.subject),
    preview: rewrite(newsletter.preview),
    bodyHtml: rewrite(newsletter.bodyHtml),
  };
}

/**
 * Get a newsletter by its step number (matches subscriber.next_step).
 * Returns null if the newsletter doesn't exist.
 * Replaces {{firstName}}, {{appUrl}}, and {{chartUrl}} template variables.
 */
export function getNewsletter(step: number, firstName: string, subscriberId?: string): Newsletter | null {
  const all = loadAll();
  const newsletter = all.get(step);
  if (!newsletter) return null;
  return replaceVariables(newsletter, firstName, subscriberId);
}

/**
 * Get a newsletter without variable replacement (for testing / introspection).
 */
export function getNewsletterRaw(step: number): Newsletter | null {
  const all = loadAll();
  return all.get(step) ?? null;
}

/**
 * How many newsletters are available on disk.
 */
export function getNewsletterCount(): number {
  return loadAll().size;
}

/**
 * The highest newsletter number on disk, or 0 if none exist.
 */
export function getMaxNewsletterNumber(): number {
  const keys = [...loadAll().keys()];
  return keys.length > 0 ? Math.max(...keys) : 0;
}

/**
 * Sorted array of all newsletter numbers on disk.
 */
export function getNewsletterNumbers(): number[] {
  return [...loadAll().keys()].sort((a, b) => a - b);
}

/**
 * Clear the cache (useful for tests).
 */
export function clearNewsletterCache(): void {
  cache = null;
}
