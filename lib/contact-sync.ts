import type { Subscriber } from '@/lib/types/subscriber';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { buildContactPropertyValues } from '@/newsletters/resolve-contact-vars';
import { BROADCAST_CONTACT_PROPERTIES } from '@/lib/resend-broadcasts';

/**
 * Compute all expected contact property values for a subscriber.
 *
 * Returns the flat key→value map that should be in Resend (and in
 * contact_sync_state). Includes: firstName, lastName, neon_id,
 * 8 chart properties, and 3 broadcast properties.
 */
export function computeExpectedContactValues(
  subscriber: Subscriber,
): Record<string, string> {
  const values: Record<string, string> = {
    first_name: subscriber.first_name,
    last_name: subscriber.last_name ?? '',
    neon_id: subscriber.id,
  };

  // Chart-derived properties (8 from contact-properties registry)
  if (subscriber.chart?.chart) {
    const chart = parseChartForEmail(subscriber.chart.chart);
    Object.assign(values, buildContactPropertyValues(chart));
  }

  // Broadcast properties (signup_month, signup_month_year, months_since_signup)
  for (const entry of Object.values(BROADCAST_CONTACT_PROPERTIES)) {
    values[entry.key] = entry.compute(subscriber);
  }

  return values;
}
