import type { ComponentType } from 'react';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';
import Newsletter07WebPersonalization from './07';
import Newsletter08WebPersonalization from './08';

/**
 * Map of newsletter number to its web personalization component.
 * Newsletters in this map will get a CTA button in email instead of
 * inline personalization, and a personalized section on the web page.
 */
const webPersonalizations: Record<number, ComponentType<{ chart: EmailChartData }>> = {
  7: Newsletter07WebPersonalization,
  8: Newsletter08WebPersonalization,
};

/**
 * Check whether a newsletter number has a web personalization component.
 */
export function hasWebPersonalization(number: number): boolean {
  return number in webPersonalizations;
}

/**
 * Get the web personalization component for a newsletter number.
 * Returns undefined if none exists.
 */
export function getWebPersonalization(number: number): ComponentType<{ chart: EmailChartData }> | undefined {
  return webPersonalizations[number];
}
