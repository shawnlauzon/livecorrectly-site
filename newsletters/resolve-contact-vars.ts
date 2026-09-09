import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';
import contactProperties from './contact-properties';

/**
 * Run all contact property extractors against a chart, returning a flat
 * key→value map. Used for both Resend contact sync and web preview rendering.
 */
export function buildContactPropertyValues(
  chart: EmailChartData,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, extract] of Object.entries(contactProperties)) {
    values[key] = extract(chart);
  }
  return values;
}

/**
 * Regex matching {{{contact.key}}} and {{{contact.key|fallback}}}.
 *
 * Triple braces are Resend's native contact property syntax. In email broadcasts,
 * Resend resolves them at send time. For web rendering and admin preview, we
 * resolve them here from chart data.
 */
const CONTACT_VAR_RE = /\{\{\{contact\.([a-z_]+)(?:\|([^}]*))?\}\}\}/g;

/**
 * Replace {{{contact.key}}} and {{{contact.key|fallback}}} in text.
 *
 * - When `chart` is provided: resolves known registry properties from the chart,
 *   leaves unknown patterns as-is (for Resend to handle at send time).
 * - When `chart` is null: uses the fallback value if present, otherwise empty string.
 */
export function resolveContactVars(
  text: string,
  chart: EmailChartData | null,
): string {
  return text.replace(CONTACT_VAR_RE, (match, key: string, fallback?: string) => {
    if (chart === null) {
      return fallback ?? '';
    }

    const extract = contactProperties[key];
    if (!extract) {
      // Unknown property — leave as-is for Resend to resolve
      return match;
    }

    return extract(chart);
  });
}
