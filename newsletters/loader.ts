import { getDbNewsletterIssues } from '@/lib/db';

/**
 * Raw newsletter issue content from the DB.
 * No rendering has been applied — consumers render for their target (email vs web).
 */
export interface RawNewsletterIssue {
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

/** Cached raw newsletter issues loaded from DB, keyed by number */
let nlCache: Map<number, RawNewsletterIssue> | null = null;

/**
 * Load all newsletter issues from the DB.
 * In production, results are cached for the process lifetime.
 * In development, DB is re-queried on every call so edits are reflected.
 */
async function loadAll(): Promise<Map<number, RawNewsletterIssue>> {
  if (nlCache && process.env.NODE_ENV === 'production') return nlCache;

  nlCache = await getDbNewsletterIssues();
  return nlCache;
}

/**
 * Load a single newsletter issue by its number (matches subscriber.next_step).
 * Returns null if the newsletter issue doesn't exist.
 */
export async function loadNewsletterIssue(step: number): Promise<RawNewsletterIssue | null> {
  const all = await loadAll();
  return all.get(step) ?? null;
}

/**
 * Load all newsletter issues as a Map keyed by number.
 */
export async function loadAllNewsletterIssues(): Promise<Map<number, RawNewsletterIssue>> {
  return loadAll();
}

/** How many newsletter issues are available in the DB. */
export async function getNewsletterIssueCount(): Promise<number> {
  const all = await loadAll();
  return all.size;
}

/** The highest newsletter issue number in the DB, or 0 if none exist. */
export async function getMaxNewsletterIssueNumber(): Promise<number> {
  const all = await loadAll();
  const keys = [...all.keys()];
  return keys.length > 0 ? Math.max(...keys) : 0;
}

/** Sorted array of all newsletter issue numbers in the DB. */
export async function getNewsletterIssueNumbers(): Promise<number[]> {
  const all = await loadAll();
  return [...all.keys()].sort((a, b) => a - b);
}

/** Clear the cache (useful for tests). */
export function clearNewsletterIssueCache(): void {
  nlCache = null;
}
