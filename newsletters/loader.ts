import matter from 'gray-matter';
import { getDbNewsletters } from '@/lib/db';

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
  /** TipTap editor JSON (null if newsletter hasn't been edited visually) */
  bodyJson: unknown | null;
  /** Pre-rendered HTML from the visual editor (null if not edited visually) */
  bodyHtml: string | null;
}

/**
 * Parse a newsletter markdown string into a RawNewsletter.
 * Exported for the seed script and tests — no DB or file I/O involved.
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
    bodyJson: null,
    bodyHtml: null,
  };
}

/** Cached raw newsletters loaded from DB, keyed by number */
let nlCache: Map<number, RawNewsletter> | null = null;

/**
 * Load all newsletters from the DB.
 * In production, results are cached for the process lifetime.
 * In development, DB is re-queried on every call so edits are reflected.
 */
async function loadAll(): Promise<Map<number, RawNewsletter>> {
  if (nlCache && process.env.NODE_ENV === 'production') return nlCache;

  nlCache = await getDbNewsletters();
  return nlCache;
}

/**
 * Load a single newsletter by its number (matches subscriber.next_step).
 * Returns null if the newsletter doesn't exist.
 */
export async function loadNewsletter(step: number): Promise<RawNewsletter | null> {
  const all = await loadAll();
  return all.get(step) ?? null;
}

/**
 * Load all newsletters as a Map keyed by number.
 */
export async function loadAllNewsletters(): Promise<Map<number, RawNewsletter>> {
  return loadAll();
}

/** How many newsletters are available in the DB. */
export async function getNewsletterCount(): Promise<number> {
  const all = await loadAll();
  return all.size;
}

/** The highest newsletter number in the DB, or 0 if none exist. */
export async function getMaxNewsletterNumber(): Promise<number> {
  const all = await loadAll();
  const keys = [...all.keys()];
  return keys.length > 0 ? Math.max(...keys) : 0;
}

/** Sorted array of all newsletter numbers in the DB. */
export async function getNewsletterNumbers(): Promise<number[]> {
  const all = await loadAll();
  return [...all.keys()].sort((a, b) => a - b);
}

/** Clear the cache (useful for tests). */
export function clearNewsletterCache(): void {
  nlCache = null;
}
