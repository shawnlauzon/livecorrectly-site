import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';
import predicates from './predicates';

/**
 * Regex matching {if:name}...{/if} blocks.
 * Both tags must be on their own lines. No nesting.
 */
const CONDITIONAL_RE = /^\{if:([a-z][-a-z0-9]*)\}\s*\n([\s\S]*?)^\{\/if\}\s*$/gm;

/** Lightweight check: does the markdown contain any {if:} blocks? */
export function hasMarkdownConditionals(markdown: string): boolean {
  return /^\{if:[a-z][-a-z0-9]*\}/m.test(markdown);
}

/**
 * Process {if:name}...{/if} conditional blocks in newsletter markdown.
 *
 * - `chart = null` (email path, or web without subscriber):
 *   Strips all predicate blocks. Keeps {if:untyped} content.
 *
 * - `chart` provided (web with subscriber):
 *   Evaluates each predicate — keeps matching blocks, strips non-matching.
 *   Strips {if:untyped} blocks (subscriber has data, so untyped doesn't apply).
 */
export function processConditionals(
  markdown: string,
  chart: EmailChartData | null,
): string {
  return markdown.replace(CONDITIONAL_RE, (_match, name: string, content: string) => {
    if (name === 'untyped') {
      // Keep untyped content only when there's no chart
      return chart === null ? content : '';
    }

    if (chart === null) {
      // No chart → strip all predicate blocks
      return '';
    }

    const predicate = predicates[name];
    if (!predicate) {
      // Unknown predicate → strip (don't show broken blocks)
      return '';
    }

    return predicate(chart) ? content : '';
  });
}
