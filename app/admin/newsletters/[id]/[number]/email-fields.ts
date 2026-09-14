/**
 * Shared field definitions for the newsletter editor's Variable and Conditional nodes.
 * Each field maps to a contact property name used in buildLiquidContext (newsletters/resolve.ts).
 *
 * Fields with `values` get a dropdown in the conditional value picker;
 * fields without `values` get a free-text input.
 */

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
  { key: 'strategy', label: 'Strategy', values: ['wait to respond before engaging', 'inform before taking action', 'wait for recognition and invitation', 'wait a 28 day cycle to reflect and assess'] },
  { key: 'inner_authority', label: 'Inner Authority', values: ['Emotional', 'Sacral', 'Splenic', 'Ego', 'Self-Projected', 'Ego-Projected', 'None'] },
  { key: 'inner_authority_description', label: 'Inner Authority Description', values: ['wait for emotional clarity', 'follow your gut', 'follow your instincts', 'follow your willful determination', 'listen to what you say'] },
  { key: 'signature_theme', label: 'Signature Theme', values: ['satisfaction', 'peace', 'success', 'surprise'] },
  { key: 'not_self_theme', label: 'Not-Self Theme', values: ['frustration', 'anger', 'bitterness', 'disappointment'] },
  { key: 'not_self_theme_adjective', label: 'Not-Self Theme (Adjective)', values: ['frustrated', 'angry', 'bitter', 'disappointed'] },
  { key: 'decision_making_strategy', label: 'Decision-making Strategy' },
];
