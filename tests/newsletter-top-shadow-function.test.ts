import { describe, it, expect } from 'vitest';
import { resolveLiquid, buildContactPropertyValues } from '@/lib/newsletter/resolve';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import type { ChartRecord } from '@/lib/types/chart';
import shawnsChartData from './fixtures/shawns-chart.json';

// Shawn's top shadow is Overcompensating, whose function is Willpower.
const record = shawnsChartData[0] as unknown as { chart: ChartRecord };
const chart = parseChartForEmail(record.chart.chart);

describe('top_shadow_function variable', () => {
  it('resolves to the function name of the top shadow in Liquid', async () => {
    expect(await resolveLiquid('{{ top_shadow_function }}', { chart })).toBe('Willpower');
  });

  it('is a contact property for Resend sends', () => {
    expect(buildContactPropertyValues(chart).top_shadow_function).toBe('Willpower');
  });

  it('is empty when the top shadow is the bridging trait (not a center function)', async () => {
    const bridged = { ...chart, topShadow: 'Bringing Traits/Strengths' };
    expect(buildContactPropertyValues(bridged).top_shadow_function).toBe('');
    expect(await resolveLiquid('{{ top_shadow_function }}', { chart: bridged })).toBe('');
  });

  it('is empty when the chart has no shadows', () => {
    expect(buildContactPropertyValues({ ...chart, topShadow: null }).top_shadow_function).toBe('');
  });
});
