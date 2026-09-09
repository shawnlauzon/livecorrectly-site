import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';

/**
 * Predicate registry for {if:name} conditional blocks in newsletter markdown.
 *
 * Each key is a block name used in the markdown (e.g. {if:builder}),
 * and each value is a function that returns true when the block should be shown.
 *
 * To add a new predicate, just add a new entry here.
 * Uses BG5/career-design terminology to match the newsletter writing style.
 */
const predicates: Record<string, (chart: EmailChartData) => boolean> = {
  builder: (chart) => chart.isGenerator,
  'classic-builder': (chart) => chart.isPureGenerator,
  'express-builder': (chart) => chart.isManifestingGenerator,
  initiator: (chart) => chart.isManifestor,
  advisor: (chart) => chart.isProjector,
  evaluator: (chart) => chart.isReflector,
  emotional: (chart) => chart.isEmotionalAuthority,
};

export default predicates;
