import { Chart } from '../types/chart';
import {
  types,
  strategies,
  innerAuthorityTypes,
  innerAuthorityDescriptions,
  definitions,
  careerDesigns,
  profileLineNames,
  signatureThemes,
  notSelfThemes,
  assimilationStyles,
  centerNames,
  isCenterDefined,
  isCenterUndefined,
  isCenterOpen,
  shadowNames,
  shadowToCenterIndex,
  gateTraits,
  groupThemes,
  type CenterStatus
} from './constants';
import { bridgeDescriptions } from './bridge-descriptions';

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
    const line1 = Number(p[0]);
    const line2 = Number(p[1]);
    const name1 = profileLineNames[line1] ?? '';
    const name2 = profileLineNames[line2] ?? '';
    return `${name1} / ${name2} (${line1}/${line2})`;
  };

  const careerDesign = () => chart.type !== undefined ? careerDesigns[chart.type] : undefined;
  const signatureTheme = () => chart.type !== undefined ? signatureThemes[chart.type] : undefined;
  const notSelfTheme = () => chart.type !== undefined ? notSelfThemes[chart.type] : undefined;
  const assimilationStyle = () => chart.definition !== undefined ? assimilationStyles[chart.definition] : undefined;

  const themes = (): string[] => {
    if (!chart.group?.theme || !Array.isArray(chart.group.theme)) return [];
    return chart.group.theme
      .map(t => groupThemes[t])
      .filter((name): name is string => !!name);
  };

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

  // Center helpers
  const getCenterStatus = (index: number): CenterStatus | undefined => {
    if (!chart.centers || index < 0 || index >= chart.centers.length) {
      return undefined;
    }
    return chart.centers[index] as CenterStatus;
  };

  // Status 2: Defined (has complete channel)
  const definedCenters = () => {
    if (!chart.centers) return [];
    return chart.centers
      .map((status, index) => ({ name: centerNames[index], status }))
      .filter(c => isCenterDefined(c.status as CenterStatus));
  };

  // Status 1: Undefined (has hanging gate, no complete channel)
  const undefinedCenters = () => {
    if (!chart.centers) return [];
    return chart.centers
      .map((status, index) => ({ name: centerNames[index], status }))
      .filter(c => isCenterUndefined(c.status as CenterStatus));
  };

  // Status 0: Open (completely open, no gates)
  const openCenters = () => {
    if (!chart.centers) return [];
    return chart.centers
      .map((status, index) => ({ name: centerNames[index], status }))
      .filter(c => isCenterOpen(c.status as CenterStatus));
  };

  // Shadow functions

  /**
   * Check if "Bringing Traits/Strengths" shadow applies.
   * This shadow is only present if:
   * 1. bridges field is not null AND
   * 2. definition is 2 (Collaborative) or 4 (Subjective)
   */
  const hasBringingTraitsShadow = (): boolean => {
    if (!chart.bridges || chart.definition === undefined) return false;
    // definition: 0=none, 1=single, 2=split, 3=triple, 4=quadruple
    // Collaborative = 2 (split), Subjective = 4 (quadruple)
    return chart.definition === 2 || chart.definition === 4;
  };

  /**
   * Get all shadows for this chart in priority order.
   * Returns an array of shadow names.
   *
   * Priority order:
   * 1. Bringing Traits/Strengths (conditional on bridges + definition)
   * 2. Willpower (Ego undefined)
   * 3. Emotional Intelligence (Solar Plexus undefined)
   * 4. Identity & Direction (G Center undefined)
   * 5. Survival Instinct (Spleen undefined)
   * 6. Conceptualization (Ajna undefined)
   * 7. Inspiration (Head undefined)
   * 8. Drive & Stamina (Root undefined)
   * 9. Energy Resource (Sacral undefined)
   * 10. Communication & Action (Throat undefined)
   */
  const getShadows = (): string[] => {
    const shadows: string[] = [];

    // Check for shadow #1: Bringing Traits/Strengths (conditional)
    if (hasBringingTraitsShadow()) {
      shadows.push(shadowNames[0]);
    }

    // Check shadows 2-10 in priority order
    // Skip index 0 (already handled above)
    for (let i = 1; i < shadowNames.length; i++) {
      const shadowName = shadowNames[i];
      const centerIndex = shadowToCenterIndex[shadowName];

      if (centerIndex !== null && centerIndex !== undefined) {
        const status = getCenterStatus(centerIndex);
        // Shadow applies if center is undefined (status 0 or 1)
        if (status === 0 || status === 1) {
          shadows.push(shadowName);
        }
      }
    }

    return shadows;
  };

  /**
   * Get bridge descriptions for the "Bringing Traits/Strengths" shadow.
   * Returns an array of bridge gate details with their descriptions.
   *
   * bridgingGates contains the gates the person DOESN'T have (wishes they had).
   * The description is indexed by the harmonic gate they DO have.
   *
   * For gates with multiple harmonics (10, 20, 34, 57), this function
   * checks which harmonic gate the person HAS in their chart and returns
   * the appropriate description for that specific harmonic pairing.
   */
  const getBridgeDescriptions = (): Array<{
    gate: number;
    trait: string;
    harmonicTrait: string;
    strength: string;
    description: string;
  }> => {
    if (!chart.bridges?.bridgingGates) return [];

    // Get list of gates the person HAS
    const userGates = chart.gates.map(g => g.gate);

    return chart.bridges.bridgingGates.map(missingGate => {
      const missingTraitInfo = gateTraits[missingGate];
      if (!missingTraitInfo) {
        // Fallback for unknown gate
        return {
          gate: missingGate,
          trait: 'Unknown',
          harmonicTrait: 'Unknown',
          strength: 'Unknown',
          description: 'Bridge description not available'
        };
      }

      // For gates with multiple harmonics (10, 20, 34, 57),
      // check which harmonic gate they HAVE in their chart
      if (Array.isArray(missingTraitInfo.harmonicGate)) {
        const matchingHarmonicIndex = missingTraitInfo.harmonicGate.findIndex(
          hGate => userGates.includes(hGate)
        );

        if (matchingHarmonicIndex >= 0) {
          const harmonicGateTheyHave = missingTraitInfo.harmonicGate[matchingHarmonicIndex];
          const descriptions = bridgeDescriptions[harmonicGateTheyHave];
          return {
            gate: missingGate,
            trait: missingTraitInfo.trait,
            harmonicTrait: (missingTraitInfo.harmonicTrait as string[])[matchingHarmonicIndex],
            strength: (missingTraitInfo.strength as string[])[matchingHarmonicIndex],
            description: Array.isArray(descriptions)
              ? descriptions[matchingHarmonicIndex]
              : descriptions
          };
        }

        // Fallback: if no matching harmonic found, use first one
        const harmonicGateTheyHave = missingTraitInfo.harmonicGate[0];
        const descriptions = bridgeDescriptions[harmonicGateTheyHave];
        return {
          gate: missingGate,
          trait: missingTraitInfo.trait,
          harmonicTrait: (missingTraitInfo.harmonicTrait as string[])[0],
          strength: (missingTraitInfo.strength as string[])[0],
          description: Array.isArray(descriptions) ? descriptions[0] : descriptions
        };
      }

      // Single harmonic case - they have the harmonic gate, they're missing this gate
      const harmonicGateTheyHave = missingTraitInfo.harmonicGate as number;
      const description = bridgeDescriptions[harmonicGateTheyHave];
      return {
        gate: missingGate,
        trait: missingTraitInfo.trait,
        harmonicTrait: missingTraitInfo.harmonicTrait as string,
        strength: missingTraitInfo.strength as string,
        description: Array.isArray(description) ? description[0] : description
      };
    });
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
    themes,
    profile,
    signatureTheme,
    notSelfTheme,
    decisionMakingStrategy,
    innerAuthorityDescription,
    isEmotionalAuthority: () => chart.authority === 0,

    // Center functions
    getCenterStatus,
    definedCenters,
    undefinedCenters,
    openCenters,
    isRootDefined: () => isCenterDefined(getCenterStatus(0) ?? 0),
    isSacralDefined: () => isCenterDefined(getCenterStatus(1) ?? 0),
    isSplenicDefined: () => isCenterDefined(getCenterStatus(2) ?? 0),
    isSolarPlexusDefined: () => isCenterDefined(getCenterStatus(3) ?? 0),
    isEgoDefined: () => isCenterDefined(getCenterStatus(4) ?? 0),
    isGCenterDefined: () => isCenterDefined(getCenterStatus(5) ?? 0),
    isThroatDefined: () => isCenterDefined(getCenterStatus(6) ?? 0),
    isAjnaDefined: () => isCenterDefined(getCenterStatus(7) ?? 0),
    isHeadDefined: () => isCenterDefined(getCenterStatus(8) ?? 0),

    // Shadow functions
    hasBringingTraitsShadow,
    getShadows,
    getBridgeDescriptions,
  };
}
