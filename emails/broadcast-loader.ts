import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { emailMarked, replaceVariables } from './markdown-renderer';
import type { BroadcastFilter } from '@/broadcasts/config';
import * as broadcastFilters from '@/broadcasts/config';

export interface Broadcast {
  slug: string;
  /** Subject line with variables replaced */
  subject: string;
  /** Preview text with variables replaced */
  preview: string;
  /** Markdown body rendered to inline-styled HTML with variables replaced */
  bodyHtml: string;
  /** Each postscript rendered from markdown with variables replaced */
  postscripts: string[];
}

/**
 * Dispatch/control configuration for a broadcast, loaded from frontmatter.
 */
export interface BroadcastFileConfig {
  slug: string;
  enabled: boolean;
  from?: string;
  filter?: BroadcastFilter;
}

interface RawBroadcast {
  slug: string;
  subject: string;
  preview: string;
  bodyMarkdown: string;
  /** Raw postscript strings (markdown, variables intact) */
  rawPs: string[];
  /** Frontmatter config fields */
  enabled: boolean;
  from?: string;
  filterName?: string;
}

/** Cached raw broadcasts loaded from disk, keyed by slug */
let cache: Map<string, RawBroadcast> | null = null;

/**
 * Parse a broadcast markdown string into a RawBroadcast.
 */
function parseRawBroadcast(content: string, slug: string): RawBroadcast {
  const { data, content: body } = matter(content);

  const subject = typeof data.subject === 'string' ? data.subject : '';
  const preview = typeof data.preview === 'string' ? data.preview : '';

  let rawPs: string[] = [];
  if (Array.isArray(data.ps)) {
    rawPs = data.ps.filter((p: unknown) => typeof p === 'string');
  } else if (typeof data.ps === 'string') {
    rawPs = [data.ps];
  }

  // Config fields from frontmatter
  const enabled = data.enabled !== false; // default true
  const from = typeof data.from === 'string' ? data.from : undefined;
  const filterName = typeof data.filter === 'string' ? data.filter : undefined;

  return { slug, subject, preview, bodyMarkdown: body, rawPs, enabled, from, filterName };
}

/**
 * Resolve a filter name from frontmatter to an actual function from broadcasts/config.ts.
 * Throws if the name doesn't match a named export.
 */
function resolveFilter(filterName: string, slug: string): BroadcastFilter {
  const fn = (broadcastFilters as Record<string, unknown>)[filterName];
  if (typeof fn !== 'function') {
    throw new Error(
      `Broadcast "${slug}" references filter "${filterName}" but no such export exists in broadcasts/config.ts`
    );
  }
  return fn as BroadcastFilter;
}

/**
 * Load a single broadcast from disk by slug.
 * In production, results are cached for the process lifetime.
 */
function loadBroadcast(slug: string): RawBroadcast | null {
  if (cache && process.env.NODE_ENV === 'production') {
    return cache.get(slug) ?? null;
  }

  if (!cache) cache = new Map();

  const filePath = path.join(process.cwd(), 'broadcasts', `${slug}.md`);
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    // File doesn't exist
    return null;
  }

  const raw = parseRawBroadcast(content, slug);
  cache.set(slug, raw);
  return raw;
}

/**
 * Load, render, and replace variables in a broadcast markdown file.
 * Returns null if the broadcast slug doesn't exist on disk.
 */
export function getBroadcast(slug: string, variables: Record<string, string>): Broadcast | null {
  const raw = loadBroadcast(slug);
  if (!raw) return null;

  const bodyHtml = replaceVariables(
    emailMarked.parse(raw.bodyMarkdown.trim()) as string,
    variables,
  );

  const postscripts = raw.rawPs.map(ps =>
    replaceVariables(
      emailMarked.parseInline(ps.trim()) as string,
      variables,
    ),
  );

  return {
    slug,
    subject: replaceVariables(raw.subject, variables),
    preview: replaceVariables(raw.preview, variables),
    bodyHtml,
    postscripts,
  };
}

/**
 * Get the file-driven config for a single broadcast slug.
 * Returns null if the broadcast doesn't exist on disk.
 */
export function getBroadcastFileConfig(slug: string): BroadcastFileConfig | null {
  const raw = loadBroadcast(slug);
  if (!raw) return null;

  return {
    slug: raw.slug,
    enabled: raw.enabled,
    from: raw.from,
    filter: raw.filterName ? resolveFilter(raw.filterName, slug) : undefined,
  };
}

/**
 * Get configs for all broadcasts on disk.
 */
export function getBroadcastConfigs(): BroadcastFileConfig[] {
  return getBroadcastSlugs().map(slug => {
    const config = getBroadcastFileConfig(slug);
    // slug came from disk, so config should always exist
    return config!;
  });
}

/**
 * Get configs for all enabled broadcasts on disk.
 */
export function getEnabledBroadcastConfigs(): BroadcastFileConfig[] {
  return getBroadcastConfigs().filter(c => c.enabled);
}

/**
 * List all broadcast slugs available on disk.
 */
export function getBroadcastSlugs(): string[] {
  const dir = path.join(process.cwd(), 'broadcasts');
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
      .sort();
  } catch {
    // Directory doesn't exist
    return [];
  }
}
