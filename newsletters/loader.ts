import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * Raw newsletter content parsed from front-matter + markdown.
 * No rendering has been applied — consumers render for their target (email vs web).
 */
export interface RawNewsletter {
  number: number;
  /** Subject line — template variables ({{firstName}}, etc.) still intact */
  subject: string;
  preview: string;
  /** URL-safe slug for the web version (from front-matter), or null if email-only */
  slug: string | null;
  /** SEO description (from front-matter) */
  description: string;
  /** Hero image filename (e.g. "lightning.jpg") from front-matter, or null if unset */
  rawImage: string | null;
  /** false when the image already appears inline in the markdown body */
  showHeroImage: boolean;
  /** Raw markdown body — template variables intact, untrimmed greeting included */
  bodyMarkdown: string;
  /** Previous slugs that should redirect to the current slug */
  oldSlugs: string[];
  /** Raw postscript strings (markdown, variables intact) */
  rawPs: string[];
}

/**
 * Parse a newsletter markdown string into a RawNewsletter.
 * Exported for testing — no file I/O involved.
 */
export function parseRawNewsletter(content: string, number: number): RawNewsletter {
  const { data, content: body } = matter(content);

  const subject = typeof data.subject === 'string' ? data.subject : '';
  const preview = typeof data.preview === 'string' ? data.preview : '';
  const slug = typeof data.slug === 'string' ? data.slug : null;
  const description = typeof data.description === 'string' ? data.description : '';

  const rawImage = typeof data.image === 'string' ? data.image : null;
  const showHeroImage = !!rawImage && !body.includes(rawImage);

  const oldSlugs: string[] = Array.isArray(data['old-slugs'])
    ? data['old-slugs'].filter((s: unknown) => typeof s === 'string')
    : [];

  let rawPs: string[] = [];
  if (Array.isArray(data.ps)) {
    rawPs = data.ps.filter((p: unknown) => typeof p === 'string');
  } else if (typeof data.ps === 'string') {
    rawPs = [data.ps];
  }

  return {
    number,
    subject,
    preview,
    slug,
    description,
    rawImage,
    showHeroImage,
    oldSlugs,
    bodyMarkdown: body,
    rawPs,
  };
}

/** Cached raw newsletters loaded from disk, keyed by number */
let cache: Map<number, RawNewsletter> | null = null;

/**
 * Load all newsletters from newsletters/*.md.
 * In production, results are cached for the process lifetime.
 * In development, files are re-read on every call so edits are reflected immediately.
 */
function loadAll(): Map<number, RawNewsletter> {
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
    cache.set(num, parseRawNewsletter(raw, num));
  }

  return cache;
}

/**
 * Load a single newsletter by its number (matches subscriber.next_step).
 * Returns null if the newsletter doesn't exist.
 */
export function loadNewsletter(step: number): RawNewsletter | null {
  return loadAll().get(step) ?? null;
}

/**
 * Load all newsletters as a Map keyed by number.
 */
export function loadAllNewsletters(): Map<number, RawNewsletter> {
  return loadAll();
}

/** How many newsletters are available on disk. */
export function getNewsletterCount(): number {
  return loadAll().size;
}

/** The highest newsletter number on disk, or 0 if none exist. */
export function getMaxNewsletterNumber(): number {
  const keys = [...loadAll().keys()];
  return keys.length > 0 ? Math.max(...keys) : 0;
}

/** Sorted array of all newsletter numbers on disk. */
export function getNewsletterNumbers(): number[] {
  return [...loadAll().keys()].sort((a, b) => a - b);
}

/** Clear the cache (useful for tests). */
export function clearNewsletterCache(): void {
  cache = null;
}
