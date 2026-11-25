import { describe, it, expect } from 'vitest';
import { resolveLiquid } from '@/lib/newsletter/resolve';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { functionToCenterIndex } from '@/lib/hd-chart/constants';
import type { ChartRecord } from '@/lib/types/chart';
import {
  parseCondition,
  composeCondition,
  CHART_DEFINITION_FIELD,
  CHART_DEFINITION_OPERATORS,
} from '@/app/admin/newsletters/[id]/[number]/condition-syntax';
import { FUNCTION_NAMES } from '@/app/admin/newsletters/[id]/[number]/email-fields';
import shawnsChartData from './fixtures/shawns-chart.json';

// Shawn's centers: Root, Sacral, Spleen and G are defined; Solar Plexus, Ego and
// Throat have hanging gates only; Ajna and Head are open (no gates). Every
// center that isn't defined is undefined, so the open ones are undefined too.
const record = shawnsChartData[0] as unknown as { chart: ChartRecord };
const chart = parseChartForEmail(record.chart.chart);

const render = (condition: string) =>
  resolveLiquid(`{% if ${condition} %}YES{% else %}NO{% endif %}`, { chart });

describe('chart definition by function', () => {
  it('sorts each function into defined or undefined, with open a subset of undefined', () => {
    expect(chart.definedFunctions).toEqual(['Drive & Stamina', 'Energy Resource', 'Survival Instinct', 'Identity & Direction']);
    expect(chart.undefinedFunctions).toEqual([
      'Emotional Intelligence', 'Willpower', 'Communication & Action', 'Conceptualization', 'Inspiration',
    ]);
    expect(chart.openFunctions).toEqual(['Conceptualization', 'Inspiration']);
  });

  it('has defined matches only a defined function', async () => {
    expect(await render(composeCondition(CHART_DEFINITION_FIELD, 'has defined', 'Energy Resource'))).toBe('YES');
    expect(await render(composeCondition(CHART_DEFINITION_FIELD, 'has defined', 'Willpower'))).toBe('NO');
    expect(await render(composeCondition(CHART_DEFINITION_FIELD, 'has defined', 'Inspiration'))).toBe('NO');
  });

  it('has undefined matches any function without a channel, open ones included', async () => {
    expect(await render(composeCondition(CHART_DEFINITION_FIELD, 'has undefined', 'Willpower'))).toBe('YES');
    expect(await render(composeCondition(CHART_DEFINITION_FIELD, 'has undefined', 'Inspiration'))).toBe('YES');
    expect(await render(composeCondition(CHART_DEFINITION_FIELD, 'has undefined', 'Energy Resource'))).toBe('NO');
  });

  it('has open matches only a function with no gates at all', async () => {
    expect(await render(composeCondition(CHART_DEFINITION_FIELD, 'has open', 'Inspiration'))).toBe('YES');
    expect(await render(composeCondition(CHART_DEFINITION_FIELD, 'has open', 'Willpower'))).toBe('NO');
    expect(await render(composeCondition(CHART_DEFINITION_FIELD, 'has open', 'Energy Resource'))).toBe('NO');
  });
});

describe('chart definition condition syntax', () => {
  it('offers has defined / has undefined / has open', () => {
    expect(CHART_DEFINITION_OPERATORS).toEqual(['has defined', 'has undefined', 'has open']);
  });

  it('composes each operator into a Liquid array test', () => {
    expect(composeCondition(CHART_DEFINITION_FIELD, 'has defined', 'Willpower')).toBe('defined_functions contains "Willpower"');
    expect(composeCondition(CHART_DEFINITION_FIELD, 'has undefined', 'Willpower')).toBe('undefined_functions contains "Willpower"');
    expect(composeCondition(CHART_DEFINITION_FIELD, 'has open', 'Willpower')).toBe('open_functions contains "Willpower"');
  });

  it('round-trips through parseCondition as a Chart Definition condition', () => {
    for (const op of CHART_DEFINITION_OPERATORS) {
      expect(parseCondition(composeCondition(CHART_DEFINITION_FIELD, op, 'Drive & Stamina'))).toEqual({
        type: 'chart', field: CHART_DEFINITION_FIELD, op, value: 'Drive & Stamina',
      });
    }
  });

  it('offers the nine center functions, not the bridging trait', () => {
    expect(FUNCTION_NAMES).toHaveLength(9);
    expect(FUNCTION_NAMES).not.toContain('Bringing Traits/Strengths');
    for (const fn of FUNCTION_NAMES) expect(functionToCenterIndex[fn]).not.toBeNull();
  });
});
