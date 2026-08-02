import { Chart } from '../types/chart';
import {
  types,
  strategies,
  careerDesigns,
  innerAuthorityTypes,
  innerAuthorityDescriptions,
  signatureThemes,
  notSelfThemes,
  signatureThemeAdjectives,
  notSelfThemeAdjectives,
  typeVideos,
  typeButtonGifs,
  strategyVideos,
  innerAuthorityVideos,
  signatureVideos
} from './constants';
import hdChart from './index';

/**
 * Flat chart data for email templates.
 * Unlike hdChart() which returns closures, this returns plain values
 * so templates can destructure directly.
 */
export interface EmailChartData {
  type: string;
  isGenerator: boolean;
  isPureGenerator: boolean;
  isManifestingGenerator: boolean;
  isManifestor: boolean;
  isProjector: boolean;
  isReflector: boolean;
  careerDesign: string;
  strategy: string;
  innerAuthority: string;
  innerAuthorityDescription: string;
  signatureTheme: string;
  notSelfTheme: string;
  signatureThemeAdjective: string;
  notSelfThemeAdjective: string;
  decisionMakingStrategy: string;
  isEmotionalAuthority: boolean;
  typeVideo: string;
  typeButtonGif: string;
  strategyVideo: string;
  innerAuthorityVideo: string;
  signatureVideo: string;
  topShadow: string | null;
  bridgeDescriptions: Array<{
    trait: string;
    harmonicTrait: string;
    strength: string;
    description: string;
  }>;
}

/**
 * Parse a raw chart into flat values for email templates.
 * This mirrors the old fractalhumandesign parseChart() function.
 */
export function parseChartForEmail(chart: Chart): EmailChartData {
  const typeIndex = chart.type;
  const authorityIndex = chart.authority;

  const decisionMakingStrategy =
    typeIndex === 2
      ? `${innerAuthorityDescriptions[authorityIndex]}, and then ${strategies[typeIndex]}`
      : `${strategies[typeIndex]}, and then ${innerAuthorityDescriptions[authorityIndex]}`;

  const hd = hdChart(chart);
  const shadows = hd.getShadows();
  const topShadow = shadows.length > 0 ? shadows[0] : null;
  const bridgeDescriptions = hd.getBridgeDescriptions();

  return {
    type: types[typeIndex],
    isGenerator: typeIndex === 0 || typeIndex === 1,
    isPureGenerator: typeIndex === 0,
    isManifestingGenerator: typeIndex === 1,
    isManifestor: typeIndex === 2,
    isProjector: typeIndex === 3,
    isReflector: typeIndex === 4,
    careerDesign: careerDesigns[typeIndex],
    strategy: strategies[typeIndex],
    innerAuthority: innerAuthorityTypes[authorityIndex],
    innerAuthorityDescription: innerAuthorityDescriptions[authorityIndex],
    signatureTheme: signatureThemes[typeIndex],
    notSelfTheme: notSelfThemes[typeIndex],
    signatureThemeAdjective: signatureThemeAdjectives[typeIndex],
    notSelfThemeAdjective: notSelfThemeAdjectives[typeIndex],
    decisionMakingStrategy,
    isEmotionalAuthority: authorityIndex === 0,
    typeVideo: typeVideos[typeIndex],
    typeButtonGif: typeButtonGifs[typeIndex],
    strategyVideo: strategyVideos[typeIndex],
    innerAuthorityVideo: innerAuthorityVideos[authorityIndex],
    signatureVideo: signatureVideos[typeIndex],
    topShadow,
    bridgeDescriptions
  };
}
