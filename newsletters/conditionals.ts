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
 * `channel` controls the rendering target:
 * - `{if:email}` → kept when channel is 'email', stripped when 'web'
 * - `{if:web}` → kept when channel is 'web', stripped when 'email'
 *
 * Chart predicates (e.g. `{if:builder}`):
 * - `chart = null`: strips all predicate blocks
 * - `chart` provided: evaluates each predicate against the chart
 */
export function processConditionals(
  markdown: string,
  chart: EmailChartData | null,
  channel: 'email' | 'web',
): string {
  return markdown.replace(CONDITIONAL_RE, (_match, name: string, content: string) => {
    // Channel conditionals — resolved before chart check
    if (name === 'email') return channel === 'email' ? content : '';
    if (name === 'web') return channel === 'web' ? content : '';

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
