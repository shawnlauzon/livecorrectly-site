import { describe, it, expect } from 'vitest';
import { resolveLiquid } from '@/newsletters/resolve';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import type { ChartRecord } from '@/lib/types/chart';
import shawnsChartData from './fixtures/shawns-chart.json';

// Shawn's shadows: Overcompensating (top), Touchy & nervous, Mentally defensive,
// Losing focus, Trying to be the star.
const record = shawnsChartData[0] as unknown as { chart: ChartRecord };
const chart = parseChartForEmail(record.chart.chart);

const render = (condition: string) =>
  resolveLiquid(`{% if ${condition} %}YES{% else %}NO{% endif %}`, { chart });

describe('shadows condition', () => {
  it('matches the top shadow', async () => {
    expect(await render('shadows contains "Overcompensating"')).toBe('YES');
  });

  it('matches a shadow that is not the top one', async () => {
    expect(chart.topShadowName).not.toBe('Losing focus');
    expect(await render('shadows contains "Losing focus"')).toBe('YES');
  });

  it('does not match a shadow the chart lacks', async () => {
    expect(await render('shadows contains "Role confusion"')).toBe('NO');
  });

  it('negates with not', async () => {
    expect(await render('not shadows contains "Role confusion"')).toBe('YES');
    expect(await render('not shadows contains "Losing focus"')).toBe('NO');
  });
});
