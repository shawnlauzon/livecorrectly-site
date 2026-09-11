import { types } from './hd-chart/constants';
import type { Chart } from './types/chart';

export const VALID_PROFILES = [
  '1/3', '1/4', '2/4', '2/5', '3/5', '3/6', '4/1', '4/6', '5/1', '5/2', '6/2', '6/3',
];

/**
 * Extract a human-readable chart property value that matches redirect_rules.property_value.
 * Returns null if the property type is unknown or the chart data is missing.
 */
export function getChartProperty(chart: Chart, propertyType: string): string | null {
  switch (propertyType) {
    case 'type':
      return types[chart.type] ?? null;
    case 'profile': {
      const p = chart.profile.toString();
      return `${p[0]}/${p[1]}`;
    }
    default:
      return null;
  }
}
