import { getDbNewsletters } from '@/lib/db';

/**
 * Raw newsletter content from the DB.
 * No rendering has been applied — consumers render for their target (email vs web).
 */
export interface RawNewsletter {
  number: number;
  /** Subject line — template variables ({{firstName}}, etc.) still intact */
  subject: string;
  preview: string;
  /** URL-safe slug for the web version, or null if email-only */
  slug: string | null;
  /** SEO description */
  description: string;
  /** Previous slugs that should redirect to the current slug */
  oldSlugs: string[];
  /** Raw postscript strings (variables intact) */
  rawPs: string[];
  /** TipTap editor JSON */
  bodyJson: unknown;
  /** Pre-rendered HTML from the visual editor */
  bodyHtml: string;
  /** Stable key assignments for Liquid dynamic sections (null if no Liquid) */
  liquidSectionMap: LiquidSectionMap | null;
}

/**
 * Stable key mapping for Liquid dynamic sections in a newsletter.
 * Keys are reused across schedule runs; removed sections free their key
 * but the index is never reused (monotonically increasing).
 */
export interface LiquidSectionMap {
  /** Current section property keys in order, e.g. ["nl_08_s1", "nl_08_s2"] */
  keys: string[];
  /** Next index to assign (only increments), e.g. 3 */
  nextIndex: number;
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
