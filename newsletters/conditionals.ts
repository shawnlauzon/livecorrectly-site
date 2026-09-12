/**
 * Regex matching {if:name}...{/if} blocks.
 * Both tags must be on their own lines. No nesting.
 */
const CONDITIONAL_RE = /^\{if:([a-z][-a-z0-9]*)\}\s*\n([\s\S]*?)^\{\/if\}\s*$/gm;

/** Lightweight check: does the markdown contain any {if:} channel blocks? */
export function hasMarkdownConditionals(markdown: string): boolean {
  return /^\{if:[a-z][-a-z0-9]*\}/m.test(markdown);
}

/**
 * Process {if:name}...{/if} **channel** conditional blocks in newsletter markdown.
 *
 * `channel` controls the rendering target:
 * - `{if:email}` → kept when channel is 'email', stripped when 'web'
 * - `{if:web}` → kept when channel is 'web', stripped when 'email'
 *
 * Chart-predicate conditionals (e.g. per-type blocks) are now handled by
 * Liquid syntax ({% if type == "Builder" %}) — see liquid-properties.ts.
 * Any remaining non-channel {if:} blocks are left as-is (they shouldn't
 * exist after migration, but this avoids silently stripping content).
 */
export function processConditionals(
  markdown: string,
  channel: 'email' | 'web',
): string {
  return markdown.replace(CONDITIONAL_RE, (_match, name: string, content: string) => {
    if (name === 'email') return channel === 'email' ? content : '';
    if (name === 'web') return channel === 'web' ? content : '';

    // Non-channel block — leave as-is (shouldn't exist after Liquid migration)
    return _match;
  });
}
