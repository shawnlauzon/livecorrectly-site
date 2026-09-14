/**
 * Shared field definitions for the newsletter editor's Variable and Conditional nodes.
 * Each field maps to a contact property name used in buildLiquidContext (newsletters/resolve.ts).
 *
 * Fields with `values` get a dropdown in the conditional value picker;
 * fields without `values` get a free-text input.
 */

import {
  innerAuthorityTypes,
  innerAuthorityDescriptions,
  innerAuthorityShortNames,
  strategies,
  signatureThemes,
  notSelfThemes,
  notSelfThemeAdjectives,
  shadowNames,
  shadowDescriptions,
} from '@/lib/hd-chart/constants';

/** Deduplicate an indexed array into unique values (preserving order). */
const unique = (arr: readonly string[]) => [...new Set(arr)];

export interface EmailField {
  key: string;
  label: string;
  /** Predefined value choices. If omitted, the conditional UI renders a text input. */
  values?: string[];
}

export const EMAIL_FIELDS: EmailField[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'career_type', label: 'Career Type', values: ['Builder (any)', 'Classic Builder', 'Express Builder', 'Initiator', 'Advisor', 'Evaluator'] },
  { key: 'type', label: 'Type', values: ['Generator (any)', 'Generator', 'Manifesting Generator', 'Manifestor', 'Projector', 'Reflector'] },
  { key: 'strategy', label: 'Strategy', values: unique(strategies) },
  { key: 'inner_authority', label: 'Inner Authority', values: unique(innerAuthorityTypes) },
  { key: 'inner_authority_description', label: 'Inner Authority Description', values: unique(innerAuthorityDescriptions) },
  { key: 'authority_short', label: 'Authority (short)', values: unique(innerAuthorityShortNames) },
  { key: 'signature_theme', label: 'Signature Theme', values: unique(signatureThemes) },
  { key: 'not_self_theme', label: 'Not-Self Theme', values: unique(notSelfThemes) },
  { key: 'not_self_theme_adjective', label: 'Not-Self Theme (Adjective)', values: unique(notSelfThemeAdjectives) },
  { key: 'top_shadow', label: 'Top Shadow', values: unique(Object.values(shadowNames)) },
  { key: 'top_shadow_description', label: 'Top Shadow Description', values: unique(Object.values(shadowDescriptions)) },
  { key: 'decision_making_strategy', label: 'Decision-making Strategy' },
];
