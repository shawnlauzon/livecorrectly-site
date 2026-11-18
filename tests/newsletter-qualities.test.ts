import { describe, it, expect } from 'vitest';
import { resolveLiquid, buildContactPropertyValues } from '@/lib/newsletter/resolve';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { profileLineNames } from '@/lib/hd-chart/constants';
import type { ChartRecord } from '@/lib/types/chart';
import { EMAIL_FIELDS, QUALITY_NAMES } from '@/app/admin/newsletters/[id]/[number]/email-fields';
import shawnsChartData from './fixtures/shawns-chart.json';

// Shawn's profile is 3/5: conscious Pioneer (3), unconscious Messenger (5).
const record = shawnsChartData[0] as unknown as { chart: ChartRecord };
const chart = parseChartForEmail(record.chart.chart);

const render = (condition: string) =>
  resolveLiquid(`{% if ${condition} %}YES{% else %}NO{% endif %}`, { chart });

describe('quality variables', () => {
  it('print the conscious quality as a number and a name', async () => {
    expect(await resolveLiquid('{{ quality_conscious }} {{ quality_conscious_name }}', { chart })).toBe('3 Pioneer');
  });

  it('print the unconscious quality as a number and a name', async () => {
    expect(await resolveLiquid('{{ quality_unconscious }} {{ quality_unconscious_name }}', { chart })).toBe('5 Messenger');
  });

  it('are contact properties for Resend sends', () => {
    expect(buildContactPropertyValues(chart)).toMatchObject({
      quality_conscious: '3',
      quality_conscious_name: 'Pioneer',
      quality_unconscious: '5',
      quality_unconscious_name: 'Messenger',
    });
  });

  it('are empty when the chart has no profile', async () => {
    const noProfile = parseChartForEmail({ ...record.chart.chart, profile: undefined as unknown as number });
    expect(buildContactPropertyValues(noProfile)).toMatchObject({
      quality_conscious: '',
      quality_conscious_name: '',
      quality_unconscious: '',
      quality_unconscious_name: '',
    });
    expect(await resolveLiquid('[{{ quality_conscious }}{{ quality_unconscious_name }}]', { chart: noProfile })).toBe('[]');
  });
});

describe('quality conditions', () => {
  it('compare one side by number', async () => {
    expect(await render('quality_conscious == "3"')).toBe('YES');
    expect(await render('quality_unconscious == "3"')).toBe('NO');
  });

  it('compare one side by name', async () => {
    expect(await render('quality_unconscious_name == "Messenger"')).toBe('YES');
    expect(await render('quality_conscious_name == "Messenger"')).toBe('NO');
  });

  it('qualities matches a quality held consciously', async () => {
    expect(await render('qualities contains "Pioneer"')).toBe('YES');
  });

  it('qualities matches a quality held unconsciously', async () => {
    expect(await render('qualities contains "Messenger"')).toBe('YES');
  });

  it('qualities does not match a quality the chart lacks', async () => {
    expect(await render('qualities contains "Leader"')).toBe('NO');
  });

  it('negates with not', async () => {
    expect(await render('not qualities contains "Leader"')).toBe('YES');
    expect(await render('not qualities contains "Pioneer"')).toBe('NO');
  });
});

describe('quality fields in the editor', () => {
  const field = (key: string) => EMAIL_FIELDS.find(f => f.key === key);

  it('offers the six quality names for the name fields and the Qualities condition', () => {
    const names = Object.values(profileLineNames);
    expect(QUALITY_NAMES).toEqual(names);
    expect(field('quality_conscious_name')?.values).toEqual(names);
    expect(field('quality_unconscious_name')?.values).toEqual(names);
  });

  it('offers the six line numbers for the number fields', () => {
    const numbers = Object.keys(profileLineNames);
    expect(field('quality_conscious')?.values).toEqual(numbers);
    expect(field('quality_unconscious')?.values).toEqual(numbers);
  });
});
