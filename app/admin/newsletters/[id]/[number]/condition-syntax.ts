/**
 * Liquid condition syntax for the newsletter editor's Conditional node.
 *
 * Pure parse/compose helpers (no React/TipTap) so they can be unit tested.
 * Condition kinds (the editor groups engagement + mode under "Newsletter"):
 * - chart field:  career_type == "Initiator"
 *                 shadows contains "Overcompensating"  /  not shadows contains "…"
 * - engagement:   newsletter_7.opened  /  newsletter_7.opened == false
 * - mode:         mode == "web"  (web vs email rendering context)
 */

import { bridgeShadowVariants } from '@/lib/hd-chart/constants';

/** Single dropdown option standing in for every bridge-shadow variant of top_shadow. */
export const SOMETHING_MISSING = 'Something missing';

/**
 * Compound "any" values expand to `field == "A" or field == "B"` in Liquid.
 * To the author they're just another value in the dropdown.
 */
export const ANY_VALUES: Record<string, { field: string; members: string[] }> = {
  'Builder (any)': { field: 'career_type', members: ['Classic Builder', 'Express Builder'] },
  'Generator (any)': { field: 'type', members: ['Generator', 'Manifesting Generator'] },
  [SOMETHING_MISSING]: { field: 'top_shadow', members: Object.values(bridgeShadowVariants).map(v => v.name) },
};

/** Engagement properties available for newsletter conditionals. */
export const NEWSLETTER_ENGAGEMENT_PROPERTIES = ['delivered', 'opened', 'clicked'] as const;
export type NewsletterEngagementProperty = typeof NEWSLETTER_ENGAGEMENT_PROPERTIES[number];

/** Fields in the Newsletter condition's "field" dropdown. */
export const NEWSLETTER_FIELDS = [
  { key: 'issue', label: 'Issue' },
  { key: 'mode', label: 'Mode' },
] as const;

/** Rendering contexts for the `mode` condition. */
export const MODE_VALUES = ['web', 'email'] as const;

/** Parsed newsletter condition: newsletter_7.opened or newsletter_7.opened == false */
export interface ParsedNewsletterCondition {
  type: 'newsletter';
  number: number;
  property: string; // e.g. 'opened'
  negated: boolean; // true → "IS NOT" (== false in Liquid)
}

/** Parsed chart field condition: career_type == "Builder" or shadows contains "Losing focus" */
export interface ParsedChartCondition {
  type: 'chart';
  field: string;
  op: string;
  value: string;
}

/** Parsed rendering-mode condition: mode == "web" */
export interface ParsedModeCondition {
  type: 'mode';
  op: string;
  value: string;
}

export type ParsedCondition = ParsedChartCondition | ParsedNewsletterCondition | ParsedModeCondition;

/**
 * Parse a Liquid condition string into structured parts.
 * Returns null for conditions the editor UI can't represent.
 */
export function parseCondition(condition: string): ParsedCondition | null {
  // Try newsletter engagement format:
  //   newsletter_7.opened          → IS (truthy)
  //   newsletter_7.opened == false → IS NOT (negated)
  const nlMatch = condition.match(/^newsletter_(\d+)\.(delivered|opened|clicked)(\s*==\s*false)?$/);
  if (nlMatch) {
    return {
      type: 'newsletter',
      number: parseInt(nlMatch[1], 10),
      property: nlMatch[2],
      negated: !!nlMatch[3],
    };
  }

  // Rendering mode: `mode == "web"` / `mode != "email"`
  const modeMatch = condition.match(/^mode\s*(==|!=)\s*"(.*)"$/);
  if (modeMatch) {
    return { type: 'mode', op: modeMatch[1], value: modeMatch[2] };
  }

  // Array membership: `shadows contains "X"` or `not shadows contains "X"`
  const containsMatch = condition.match(/^(not\s+)?(\w+)\s+contains\s+"(.*)"$/);
  if (containsMatch) {
    const op = containsMatch[1] ? 'not contains' : 'contains';
    return { type: 'chart', field: containsMatch[2], op, value: containsMatch[3] };
  }

  // Compound "any" with `or`: `field == "A" or field == "B"`
  for (const [anyLabel, def] of Object.entries(ANY_VALUES)) {
    const eqParts = def.members.map(m => `${def.field} == "${m}"`).join(' or ');
    const neqParts = def.members.map(m => `${def.field} != "${m}"`).join(' and ');
    if (condition === eqParts) return { type: 'chart', field: def.field, op: '==', value: anyLabel };
    if (condition === neqParts) return { type: 'chart', field: def.field, op: '!=', value: anyLabel };
  }
  // Standard: `field == "value"` or `field != "value"` (value may be empty for free-text fields)
  const match = condition.match(/^(\w+)\s*(==|!=)\s*"(.*)"$/);
  if (!match) return null;
  return { type: 'chart', field: match[1], op: match[2], value: match[3] };
}

/**
 * Compose structured parts into a Liquid condition string (chart field).
 * `not contains` isn't a Liquid operator; it becomes `not field contains "X"`
 * (`not` binds looser than `contains` in liquidjs, so it negates the whole test).
 */
export function composeCondition(field: string, op: string, value: string): string {
  if (op === 'contains') return `${field} contains "${value}"`;
  if (op === 'not contains') return `not ${field} contains "${value}"`;
  const any = ANY_VALUES[value];
  if (any) {
    if (op === '!=') {
      // All must not match: `field != "A" and field != "B"`
      return any.members.map(m => `${any.field} != "${m}"`).join(' and ');
    }
    // Any must match: `field == "A" or field == "B"`
    return any.members.map(m => `${any.field} == "${m}"`).join(' or ');
  }
  return `${field} ${op} "${value}"`;
}

/** Compose a newsletter engagement condition: newsletter_7.opened or newsletter_7.opened == false */
export function composeNewsletterCondition(num: number, property: string, negated = false): string {
  const base = `newsletter_${num}.${property}`;
  return negated ? `${base} == false` : base;
}


/** Compose a rendering-mode condition: mode == "web" */
export function composeModeCondition(op: string, value: string): string {
  return `mode ${op} "${value}"`;
}
