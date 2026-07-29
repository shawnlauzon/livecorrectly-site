import { Chart } from '../types/chart';
import {
  types,
  strategies,
  innerAuthorityTypes,
  innerAuthorityDescriptions,
  definitions,
  careerDesigns,
  signatureThemes,
  notSelfThemes,
  assimilationStyles
} from './constants';

/**
 * HD Chart utility for interpreting chart data
 * Adapted from fractalhumandesign utils/hd-chart.ts
 */
export default function hdChart(chart: Chart) {
  const type = () => chart.type !== undefined ? types[chart.type] : undefined;
  const strategy = () => chart.type !== undefined ? strategies[chart.type] : undefined;
  const innerAuthority = () => chart.authority !== undefined ? innerAuthorityTypes[chart.authority] : undefined;
  const innerAuthorityDescription = () =>
    chart.authority !== undefined ? innerAuthorityDescriptions[chart.authority] : undefined;
  const definition = () => chart.definition !== undefined ? definitions[chart.definition] : undefined;
  const profile = () => {
    if (!chart.profile) return undefined;
    const p = chart.profile.toString();
    return `${p[0]}/${p[1]}`;
  };

  const careerDesign = () => chart.type !== undefined ? careerDesigns[chart.type] : undefined;
  const signatureTheme = () => chart.type !== undefined ? signatureThemes[chart.type] : undefined;
  const notSelfTheme = () => chart.type !== undefined ? notSelfThemes[chart.type] : undefined;
  const assimilationStyle = () => chart.definition !== undefined ? assimilationStyles[chart.definition] : undefined;

  const decisionMakingStrategy = () => {
    if (chart.type === undefined || chart.authority === undefined) return undefined;
    return chart.type === 2
      ? `${innerAuthorityDescriptions[chart.authority]}, and then ${
          strategies[chart.type]
        }`
      : `${strategies[chart.type]}, and then ${
          innerAuthorityDescriptions[chart.authority]
        }`;
  };

  return {
    type,
    isGenerator: () => chart.type === 0 || chart.type === 1,
    isManifestor: () => chart.type === 2,
    isProjector: () => chart.type === 3,
    isReflector: () => chart.type === 4,
    careerDesign,
    strategy,
    innerAuthority,
    definition,
    assimilationStyle,
    profile,
    signatureTheme,
    notSelfTheme,
    decisionMakingStrategy,
    innerAuthorityDescription,
    isEmotionalAuthority: () => chart.authority === 0
  };
}
