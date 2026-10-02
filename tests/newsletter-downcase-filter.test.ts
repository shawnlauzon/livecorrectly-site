import { describe, it, expect } from 'vitest';
import { replaceLiquidOutputTags, computeDerivedPropertyValues, resolveLiquid } from '@/lib/newsletter/resolve';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import type { ChartRecord } from '@/lib/types/chart';
import shawnsChartData from './fixtures/shawns-chart.json';

const record = shawnsChartData[0] as unknown as { chart: ChartRecord };
const chart = parseChartForEmail(record.chart.chart);
const emptyMap = { keys: [], nextIndex: 0 };

describe('downcase filter', () => {
  it('lowercases in direct Liquid rendering', async () => {
    expect(await resolveLiquid('{{ first_name | downcase }}', { chart, firstName: 'SHAWN' })).toBe('shawn');
  });

  it('becomes a derived contact property for broadcasts', () => {
    const { template, derivedProperties } = replaceLiquidOutputTags('Hi {{ first_name | downcase }}', emptyMap);
    expect(template).toBe('Hi {{{contact.first_name_downcased}}}');
    expect(derivedProperties).toEqual([{ propertyKey: 'first_name_downcased', baseVar: 'first_name', filter: 'downcase' }]);
  });

  it('lowercases the default fallback for broadcasts', () => {
    const { template } = replaceLiquidOutputTags("Hi {{ first_name | default: 'There' | downcase }}", emptyMap);
    expect(template).toBe('Hi {{{contact.first_name_downcased|there}}}');
  });

  it('computes the derived value per subscriber', async () => {
    const values = await computeDerivedPropertyValues(
      [{ propertyKey: 'first_name_downcased', baseVar: 'first_name', filter: 'downcase' }],
      chart,
      'Shawn',
    );
    expect(values).toEqual({ first_name_downcased: 'shawn' });
  });
});
