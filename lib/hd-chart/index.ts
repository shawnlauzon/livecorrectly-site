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
  functionNames,
  functionToCenterIndex,
  gateTraits,
  gateToCenter,
  groupThemes,
  channelStrengths,
  awarenessStreams,
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
   * This shadow is present when definition is 2 (split/collaborative) or
   * 4 (quadruple/subjective) — regardless of whether the bridges field
   * exists. When bridges data is missing, the admin UI shows a default
   * description instead of per-gate details.
   */
  const hasBringingTraitsShadow = (): boolean => {
    if (chart.definition === undefined) return false;
    // definition: 0=none, 1=single, 2=split, 3=triple, 4=quadruple
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
      shadows.push(functionNames[0]);
    }

    // Check shadows 2-10 in priority order
    // Skip index 0 (already handled above)
    for (let i = 1; i < functionNames.length; i++) {
      const funcName = functionNames[i];
      const centerIndex = functionToCenterIndex[funcName];

      if (centerIndex !== null && centerIndex !== undefined) {
        const status = getCenterStatus(centerIndex);
        // Shadow applies if center is undefined (status 0 or 1)
        if (status === 0 || status === 1) {
          shadows.push(funcName);
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
    harmonicGate: number;
    harmonicTrait: string;
    strength: string;
    description: string;
    isChannelBridge?: boolean;
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
          harmonicGate: 0,
          harmonicTrait: 'Unknown',
          strength: 'Unknown',
          description: 'Bridge description not available'
        };
      }

      // For gates with multiple harmonics (10, 20, 34, 57),
      // check which harmonic gate they HAVE in their chart
      if (Array.isArray(missingTraitInfo.harmonicGate)) {
        // Find all matching harmonics, prefer Sacral/Splenic centers
        const matchingHarmonics = missingTraitInfo.harmonicGate
          .map((hGate, idx) => ({ gate: hGate, idx }))
          .filter(h => userGates.includes(h.gate));

        // Prefer harmonics in Sacral (1) or Splenic (2) centers
        const preferred = matchingHarmonics.find(h => {
          const center = gateToCenter[h.gate];
          return center === 1 || center === 2;
        });
        const best = preferred ?? matchingHarmonics[0];
        const matchingHarmonicIndex = best?.idx ?? -1;

        if (matchingHarmonicIndex >= 0) {
          const harmonicGateTheyHave = missingTraitInfo.harmonicGate[matchingHarmonicIndex];
          const descriptions = bridgeDescriptions[harmonicGateTheyHave];
          // Description arrays are ordered by the HAD gate's harmonicGate array,
          // not the missing gate's. Look up where the missing gate sits in
          // the had gate's ordering to get the correct description index.
          const hadGateInfo = gateTraits[harmonicGateTheyHave];
          const descriptionIndex = Array.isArray(hadGateInfo.harmonicGate)
            ? (hadGateInfo.harmonicGate as number[]).indexOf(missingGate)
            : 0;
          return {
            gate: missingGate,
            trait: missingTraitInfo.trait,
            harmonicGate: harmonicGateTheyHave,
            harmonicTrait: (missingTraitInfo.harmonicTrait as string[])[matchingHarmonicIndex],
            strength: (missingTraitInfo.strength as string[])[matchingHarmonicIndex],
            description: Array.isArray(descriptions)
              ? descriptions[descriptionIndex >= 0 ? descriptionIndex : 0]
              : descriptions
          };
        }

        // Fallback: if no matching harmonic found, use first one
        const harmonicGateTheyHave = missingTraitInfo.harmonicGate[0];
        const descriptions = bridgeDescriptions[harmonicGateTheyHave];
        return {
          gate: missingGate,
          trait: missingTraitInfo.trait,
          harmonicGate: harmonicGateTheyHave,
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
        harmonicGate: harmonicGateTheyHave,
        harmonicTrait: missingTraitInfo.harmonicTrait as string,
        strength: missingTraitInfo.strength as string,
        description: Array.isArray(description) ? description[0] : description
      };
    });
  };

  /**
   * Get strengths (defined channels) for this chart.
   * Returns strength name and thematic group for each channel index.
   */
  const getStrengths = (): { name: string; thematic: string }[] => {
    return (chart.channels ?? [])
      .filter(i => i >= 0 && i < channelStrengths.length)
      .map(i => ({
        name: channelStrengths[i].name,
        thematic: channelStrengths[i].thematic,
      }));
  };

  /**
   * Check if the chart has "near" bridging gates (specific per-gate descriptions).
   */
  const hasNearBridges = (): boolean => {
    return Array.isArray(chart.bridges?.bridgingGates) && chart.bridges!.bridgingGates!.length > 0;
  };

  /**
   * Check if the chart has "far" bridging gates (triple/quadruple split —
   * generic description about blaming others / working with others).
   */
  const hasFarBridges = (): boolean => {
    return Array.isArray(chart.bridges?.bridgingFarGates) && chart.bridges!.bridgingFarGates!.length > 0;
  };

  /**
   * Determine split width label for definition=2 charts.
   * - '-': no split (definition 0 or 1)
   * - '2': simple split (1 gate bridges the gap)
   * - '2W': wide split (2 gates needed — either a channel or a pair of gates)
   * - '2VW': very wide split (3+ gates needed)
   * - '3': triple split
   * - '4': quadruple split
   *
   * Uses connectivity analysis: builds center-to-center edges from ALL
   * bridge candidates (bridgingGates, bridgingFarGates, bridgingChannels),
   * then checks the minimum set size that connects all defined-center
   * components via connectsAllComponents().
   */
  const splitType = (): string => {
    const def = chart.definition;
    if (def === undefined || def <= 1) return '-';
    if (def === 3) return '3';
    if (def === 4) return '4';

    // def === 2: determine width from connectivity analysis
    const components = findDefinedComponents();
    if (components.length <= 1) return '2'; // no split to bridge

    const userGates = chart.gates.map(g => g.gate);

    // --- Build single-gate edges from bridgingGates ---
    const singleGateEdges: Array<{ c1: number; c2: number }> = [];
    for (const missingGate of chart.bridges?.bridgingGates ?? []) {
      const traitInfo = gateTraits[missingGate];
      if (!traitInfo) continue;
      const c1 = gateToCenter[missingGate];
      if (c1 === undefined) continue;

      if (Array.isArray(traitInfo.harmonicGate)) {
        for (const hg of traitInfo.harmonicGate) {
          if (userGates.includes(hg)) {
            const c2 = gateToCenter[hg];
            if (c2 !== undefined) {
              singleGateEdges.push({ c1, c2 });
              break; // one edge per missing gate
            }
          }
        }
      } else {
        if (userGates.includes(traitInfo.harmonicGate)) {
          const c2 = gateToCenter[traitInfo.harmonicGate];
          if (c2 !== undefined) {
            singleGateEdges.push({ c1, c2 });
          }
        }
      }
    }

    // --- Build single-gate edges from bridgingFarGates ---
    const farGateEdges: Array<{ c1: number; c2: number }> = [];
    for (const missingGate of chart.bridges?.bridgingFarGates ?? []) {
      const traitInfo = gateTraits[missingGate];
      if (!traitInfo) continue;
      const c1 = gateToCenter[missingGate];
      if (c1 === undefined) continue;

      if (Array.isArray(traitInfo.harmonicGate)) {
        for (const hg of traitInfo.harmonicGate) {
          if (userGates.includes(hg)) {
            const c2 = gateToCenter[hg];
            if (c2 !== undefined) {
              farGateEdges.push({ c1, c2 });
              break;
            }
          }
        }
      } else {
        if (userGates.includes(traitInfo.harmonicGate)) {
          const c2 = gateToCenter[traitInfo.harmonicGate];
          if (c2 !== undefined) {
            farGateEdges.push({ c1, c2 });
          }
        }
      }
    }

    // --- Build channel edges from bridgingChannels ---
    // Each channel "g1/g2" creates an edge between gateToCenter[g1] and gateToCenter[g2].
    // Neither gate is defined (the person has neither), so both centers may be
    // undefined waypoints — connectsAllComponents handles this.
    const channelEdgePairs: Array<Array<{ c1: number; c2: number }>> = [];
    for (const channelStr of chart.bridges?.bridgingChannels ?? []) {
      const parts = channelStr.split('/').map(Number);
      if (parts.length !== 2 || parts.some(isNaN)) continue;
      const [g1, g2] = parts;
      const c1 = gateToCenter[g1];
      const c2 = gateToCenter[g2];
      if (c1 !== undefined && c2 !== undefined) {
        channelEdgePairs.push([{ c1, c2 }]);
      }
    }

    // Combine all single-gate edges
    const allSingleEdges = [...singleGateEdges, ...farGateEdges];

    // Check if any single gate edge connects all components → '2'
    for (const edge of singleGateEdges) {
      if (connectsAllComponents(components, [edge])) return '2';
    }

    // Check if any single channel connects all components → '2W'
    for (const channelEdges of channelEdgePairs) {
      if (connectsAllComponents(components, channelEdges)) return '2W';
    }

    // Check if any pair of single-gate edges connects all components → '2W'
    for (let i = 0; i < allSingleEdges.length; i++) {
      for (let j = i + 1; j < allSingleEdges.length; j++) {
        if (connectsAllComponents(components, [allSingleEdges[i], allSingleEdges[j]])) return '2W';
      }
    }

    // Check if any single far gate edge + channel edge connects → '2VW' (3 gates)
    // or other 3-gate combinations
    return '2VW';
  };

  /**
   * Check if the chart has channel bridges (wide/very wide split —
   * bridgingChannels populated but bridgingGates empty).
   */
  const hasChannelBridges = (): boolean => {
    return !chart.bridges?.bridgingGates?.length
      && !!chart.bridges?.bridgingChannels?.length;
  };

  type BridgeDesc = ReturnType<typeof getBridgeDescriptions>[number];

  /**
   * Find connected components among defined centers using defined channels.
   * Returns an array of Sets, each containing center indices that are connected
   * via defined channels.
   */
  const findDefinedComponents = (): Set<number>[] => {
    if (!chart.centers || !chart.channels) return [];

    // Build adjacency list from defined channels
    const adjacency = new Map<number, Set<number>>();
    for (const channelIdx of chart.channels) {
      if (channelIdx < 0 || channelIdx >= channelStrengths.length) continue;
      const [g1, g2] = channelStrengths[channelIdx].gates;
      const c1 = gateToCenter[g1];
      const c2 = gateToCenter[g2];
      if (c1 === undefined || c2 === undefined) continue;
      if (!adjacency.has(c1)) adjacency.set(c1, new Set());
      if (!adjacency.has(c2)) adjacency.set(c2, new Set());
      adjacency.get(c1)!.add(c2);
      adjacency.get(c2)!.add(c1);
    }

    // Find connected components among defined centers (status=2)
    const definedCenterSet = new Set<number>();
    for (let i = 0; i < chart.centers.length; i++) {
      if (chart.centers[i] === 2) definedCenterSet.add(i);
    }

    const components: Set<number>[] = [];
    const visited = new Set<number>();

    for (const center of definedCenterSet) {
      if (visited.has(center)) continue;
      const component = new Set<number>();
      const queue = [center];
      while (queue.length > 0) {
        const current = queue.pop()!;
        if (visited.has(current)) continue;
        if (!definedCenterSet.has(current)) continue;
        visited.add(current);
        component.add(current);
        const neighbors = adjacency.get(current);
        if (neighbors) {
          for (const n of neighbors) {
            if (!visited.has(n) && definedCenterSet.has(n)) {
              queue.push(n);
            }
          }
        }
      }
      components.push(component);
    }

    return components;
  };

  /**
   * Check if adding a set of bridge edges connects all defined-center components.
   * Uses union-find with waypoint support for undefined intermediate centers.
   */
  const connectsAllComponents = (
    comps: Set<number>[],
    edges: Array<{ c1: number; c2: number }>
  ): boolean => {
    // Map each center to its component index
    const centerToComp = new Map<number, number>();
    for (let i = 0; i < comps.length; i++) {
      for (const center of comps[i]) {
        centerToComp.set(center, i);
      }
    }

    // parent array for union-find on component indices
    const parent = Array.from({ length: comps.length }, (_, i) => i);
    const find = (x: number): number => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    };

    for (const edge of edges) {
      const comp1 = centerToComp.get(edge.c1);
      const comp2 = centerToComp.get(edge.c2);

      if (comp1 !== undefined && comp2 !== undefined) {
        union(comp1, comp2);
      } else if (comp1 !== undefined || comp2 !== undefined) {
        const definedComp = comp1 ?? comp2!;
        const undefinedCenter = comp1 !== undefined ? edge.c2 : edge.c1;
        centerToComp.set(undefinedCenter, definedComp);
      } else {
        const tempIdx = parent.length;
        parent.push(tempIdx);
        centerToComp.set(edge.c1, tempIdx);
        centerToComp.set(edge.c2, tempIdx);
      }
    }

    // Re-run unions after all waypoints are assigned
    for (const edge of edges) {
      const comp1 = centerToComp.get(edge.c1);
      const comp2 = centerToComp.get(edge.c2);
      if (comp1 !== undefined && comp2 !== undefined) {
        union(comp1, comp2);
      }
    }

    const roots = new Set<number>();
    for (let i = 0; i < comps.length; i++) {
      roots.add(find(i));
    }
    return roots.size === 1;
  };

  /**
   * Get far bridge descriptions — identifies which specific far bridges
   * connect all defined-center components using minimum bridge channels.
   *
   * For split (definition=2) and quadruple split (definition=4), far bridges
   * are channels that need 2+ intermediate steps to connect the components.
   * This algorithm finds the minimum set of far bridges needed and ranks them
   * by the same 4-tier priority system used for near bridges.
   */
  const getFarBridgeDescriptions = (): BridgeDesc[] => {
    if (!chart.bridges?.bridgingFarGates || chart.bridges.bridgingFarGates.length === 0) return [];

    const components = findDefinedComponents();
    if (components.length <= 1) return [];

    const userGates = chart.gates.map(g => g.gate);

    // Build candidate bridge edges grouped by missing gate
    // Each missing gate creates one or more edges between centers
    const candidateBridges = new Map<number, Array<{
      c1: number;
      c2: number;
      harmonicGate: number;
      harmonicIndex: number;  // index into multi-harmonic array, or 0 for single
    }>>();

    for (const missingGate of chart.bridges.bridgingFarGates) {
      const traitInfo = gateTraits[missingGate];
      if (!traitInfo) continue;

      const missingCenter = gateToCenter[missingGate];
      if (missingCenter === undefined) continue;

      const edges: Array<{ c1: number; c2: number; harmonicGate: number; harmonicIndex: number }> = [];

      if (Array.isArray(traitInfo.harmonicGate)) {
        // Multi-harmonic gate — check each harmonic
        for (let i = 0; i < traitInfo.harmonicGate.length; i++) {
          const harmonicGate = traitInfo.harmonicGate[i];
          if (userGates.includes(harmonicGate)) {
            const harmonicCenter = gateToCenter[harmonicGate];
            if (harmonicCenter !== undefined) {
              edges.push({ c1: missingCenter, c2: harmonicCenter, harmonicGate, harmonicIndex: i });
            }
          }
        }
      } else {
        // Single harmonic — check if user has it
        if (userGates.includes(traitInfo.harmonicGate)) {
          const harmonicCenter = gateToCenter[traitInfo.harmonicGate];
          if (harmonicCenter !== undefined) {
            edges.push({ c1: missingCenter, c2: harmonicCenter, harmonicGate: traitInfo.harmonicGate, harmonicIndex: 0 });
          }
        }
      }

      if (edges.length > 0) {
        candidateBridges.set(missingGate, edges);
      }
    }

    if (candidateBridges.size === 0) return [];

    // Find minimum bridge set via brute-force combination search
    const missingGates = Array.from(candidateBridges.keys());
    const numComponents = components.length;

    // Generate combinations of k items from an array
    function* combinations<T>(arr: T[], k: number): Generator<T[]> {
      if (k === 0) { yield []; return; }
      if (k > arr.length) return;
      for (let i = 0; i <= arr.length - k; i++) {
        for (const rest of combinations(arr.slice(i + 1), k - 1)) {
          yield [arr[i], ...rest];
        }
      }
    }

    let selectedGates: number[] | null = null;

    // Search for minimum-size combinations starting from (numComponents - 1)
    for (let k = numComponents - 1; k <= missingGates.length; k++) {
      const validSets: number[][] = [];

      for (const combo of combinations(missingGates, k)) {
        // Collect all edges from this combination
        const edges = combo.flatMap(gate => candidateBridges.get(gate)!);
        if (connectsAllComponents(components, edges)) {
          validSets.push(combo);
        }
      }

      if (validSets.length > 0) {
        // Rank valid sets by priority scoring
        selectedGates = rankBridgeSets(validSets, candidateBridges);
        break;
      }
    }

    if (!selectedGates) {
      // No combination found — fall back to all far bridges
      selectedGates = missingGates;
    }

    // Build bridge descriptions for the selected gates, ordered by priority
    return buildFarBridgeDescs(selectedGates, candidateBridges, components);
  };

  /**
   * Get channel bridge descriptions for wide/very wide splits.
   * These are bridges where BOTH gates of the channel are missing —
   * the person has neither gate. The shadow is externalized:
   * - Wide (2W): blame the other person
   * - Very wide (2VW): blame the world
   *
   * Only runs when bridgingGates is empty and bridgingChannels is populated.
   */
  const getChannelBridgeDescriptions = (): BridgeDesc[] => {
    if (chart.bridges?.bridgingGates?.length) return [];
    if (!chart.bridges?.bridgingChannels?.length) return [];

    const split = splitType();
    const isVeryWide = split === '2VW';

    const results: BridgeDesc[] = [];
    for (const channelStr of chart.bridges.bridgingChannels) {
      const parts = channelStr.split('/').map(Number);
      if (parts.length !== 2 || parts.some(isNaN)) continue;
      const [g1, g2] = parts;

      // Find the channel strength name
      const channel = channelStrengths.find(
        ch => (ch.gates[0] === g1 && ch.gates[1] === g2)
           || (ch.gates[0] === g2 && ch.gates[1] === g1)
      );
      const strengthName = channel?.name ?? 'Unknown';

      // Get traits for each gate
      const trait1 = gateTraits[g1]?.trait ?? 'Unknown';
      const trait2 = gateTraits[g2]?.trait ?? 'Unknown';

      const description = isVeryWide
        ? `You believe the world needs more ${strengthName}.`
        : `You believe the other needs to bring more ${strengthName}.`;

      results.push({
        gate: g1,
        trait: trait1,
        harmonicGate: g2,
        harmonicTrait: trait2,
        strength: strengthName,
        description,
        isChannelBridge: true,
      });
    }
    return results;
  };

  type BridgeScore = {
    tier: number;           // 1-5 (Sun exclusive / Earth exclusive / stream / non-exclusive Sun|Earth / default)
    activationCount: number; // how many planets activate the harmonic gate (more = better)
    bestPlanetId: number;   // lowest planet id on harmonic gate (lower = more important)
  };

  /**
   * Score a bridge (missing gate + harmonic) with full detail for tiebreaking.
   *
   * Tier system:
   * 1 (highest): Sun activates the harmonic exclusively
   * 2: Earth activates the harmonic exclusively
   * 3: Bridge completes an awareness stream
   * 4: Sun/Earth activates the harmonic non-exclusively
   * 5 (default): No special priority
   *
   * activationCount: how many planets activate the harmonic gate (more = better)
   * bestPlanetId: lowest planet id on the harmonic gate (lower = more important)
   */
  const scoreBridgeDetailed = (missingGate: number, harmonicGate: number): BridgeScore => {
    const planets = chart.planets ?? [];
    const userGates = chart.gates.map(g => g.gate);

    // Count how many harmonics the person has for this missing gate
    const traitInfo = gateTraits[missingGate];
    let harmonicCount = 1;
    if (traitInfo && Array.isArray(traitInfo.harmonicGate)) {
      harmonicCount = traitInfo.harmonicGate.filter(hg => userGates.includes(hg)).length;
    }
    const isExclusive = harmonicCount <= 1;

    // Planet data on the harmonic gate
    const harmonicPlanets = planets.filter(p => p.gate === harmonicGate);
    const activationCount = harmonicPlanets.length;
    const bestPlanetId = harmonicPlanets.length > 0
      ? Math.min(...harmonicPlanets.map(p => p.id))
      : Infinity;

    let hasSun = false;
    let hasEarth = false;
    for (const p of harmonicPlanets) {
      if (p.id === 0) hasSun = true;
      if (p.id === 1) hasEarth = true;
    }

    // Tier 1: Sun exclusive
    if (hasSun && isExclusive) return { tier: 1, activationCount, bestPlanetId };
    // Tier 2: Earth exclusive
    if (hasEarth && isExclusive) return { tier: 2, activationCount, bestPlanetId };

    // Tier 3: Stream completion
    const definedChannelPairs = new Set<string>();
    for (const channelIndex of chart.channels ?? []) {
      if (channelIndex >= 0 && channelIndex < channelStrengths.length) {
        const gates = channelStrengths[channelIndex].gates;
        const key = [gates[0], gates[1]].sort((a, b) => a - b).join(',');
        definedChannelPairs.add(key);
      }
    }
    const bridgeChannelKey = [missingGate, harmonicGate].sort((a, b) => a - b).join(',');
    for (const stream of awarenessStreams) {
      const streamKeys = stream.channels.map(ch => [...ch].sort((a, b) => a - b).join(','));
      if (!streamKeys.includes(bridgeChannelKey)) continue;
      const others = streamKeys.filter(key => key !== bridgeChannelKey);
      if (others.every(key => definedChannelPairs.has(key))) {
        return { tier: 3, activationCount, bestPlanetId };
      }
    }

    // Tier 4: Non-exclusive Sun/Earth
    if ((hasSun || hasEarth) && !isExclusive) return { tier: 4, activationCount, bestPlanetId };

    // Tier 5: Default
    return { tier: 5, activationCount, bestPlanetId };
  };

  /**
   * Compare two BridgeScores. Returns <0 if a is better (higher priority).
   * Comparison order: tier (ascending), activationCount (descending), bestPlanetId (ascending).
   */
  const compareBridgeScores = (a: BridgeScore, b: BridgeScore): number => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.activationCount !== b.activationCount) return b.activationCount - a.activationCount;
    return a.bestPlanetId - b.bestPlanetId;
  };

  /**
   * Compute harmonic exclusivity for a bridge set.
   * For each missing gate in the set, finds the best harmonic the person has,
   * then counts how many alternative channel partners that harmonic gate has.
   * Lower total = more exclusive = preferred.
   *
   * Example: gate 25 has harmonicGate: 51 (single) → 1 alternative.
   *          gate 10 has harmonicGate: [20, 34, 57] → 3 alternatives.
   * Set {51,33} using harmonics {25,13} → 1+1 = 2 (preferred).
   * Set {57,33} using harmonics {10,13} → 3+1 = 4.
   */
  const getSetExclusivity = (
    gates: number[],
    candidates: Map<number, Array<{ c1: number; c2: number; harmonicGate: number; harmonicIndex: number }>>
  ): number => {
    let total = 0;
    for (const gate of gates) {
      const edges = candidates.get(gate) ?? [];
      if (edges.length === 0) continue;
      // Pick the best harmonic edge for this gate (lowest score)
      let bestEdge = edges[0];
      let bestScore = scoreBridgeDetailed(gate, bestEdge.harmonicGate);
      for (let i = 1; i < edges.length; i++) {
        const score = scoreBridgeDetailed(gate, edges[i].harmonicGate);
        if (compareBridgeScores(score, bestScore) < 0) {
          bestScore = score;
          bestEdge = edges[i];
        }
      }
      // Count how many harmonics the winning harmonic gate has
      const harmonicTraitInfo = gateTraits[bestEdge.harmonicGate];
      if (harmonicTraitInfo && Array.isArray(harmonicTraitInfo.harmonicGate)) {
        total += harmonicTraitInfo.harmonicGate.length;
      } else {
        total += 1;
      }
    }
    return total;
  };

  /**
   * Rank multiple valid bridge sets and return the best one.
   *
   * Comparison order:
   * 1. Harmonic exclusivity (lower total alternatives = better) — set-level
   * 2. Per-bridge BridgeScore tuples (lexicographic) — bridge-level
   */
  const rankBridgeSets = (
    validSets: number[][],
    candidates: Map<number, Array<{ c1: number; c2: number; harmonicGate: number; harmonicIndex: number }>>
  ): number[] => {
    if (validSets.length === 1) return validSets[0];

    let bestSet = validSets[0];
    let bestExclusivity = getSetExclusivity(bestSet, candidates);
    let bestScores = getBestScoresForSet(bestSet, candidates);

    for (let i = 1; i < validSets.length; i++) {
      const exclusivity = getSetExclusivity(validSets[i], candidates);
      const scores = getBestScoresForSet(validSets[i], candidates);

      // Primary: harmonic exclusivity (lower = better)
      if (exclusivity < bestExclusivity) {
        bestSet = validSets[i];
        bestExclusivity = exclusivity;
        bestScores = scores;
      } else if (exclusivity === bestExclusivity) {
        // Secondary: per-bridge score tuples
        if (compareBridgeScoreArrays(scores, bestScores) < 0) {
          bestSet = validSets[i];
          bestExclusivity = exclusivity;
          bestScores = scores;
        }
      }
    }

    return bestSet;
  };

  /**
   * Get the best BridgeScore for each gate in a set,
   * sorted by compareBridgeScores (best first).
   */
  const getBestScoresForSet = (
    gates: number[],
    candidates: Map<number, Array<{ c1: number; c2: number; harmonicGate: number; harmonicIndex: number }>>
  ): BridgeScore[] => {
    return gates
      .map(gate => {
        const edges = candidates.get(gate) ?? [];
        let best: BridgeScore = { tier: Infinity, activationCount: 0, bestPlanetId: Infinity };
        for (const e of edges) {
          const score = scoreBridgeDetailed(gate, e.harmonicGate);
          if (compareBridgeScores(score, best) < 0) {
            best = score;
          }
        }
        return best;
      })
      .sort(compareBridgeScores);
  };

  /**
   * Lexicographic comparison of two BridgeScore arrays (lower = better).
   */
  const compareBridgeScoreArrays = (a: BridgeScore[], b: BridgeScore[]): number => {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const va = a[i] ?? { tier: Infinity, activationCount: 0, bestPlanetId: Infinity };
      const vb = b[i] ?? { tier: Infinity, activationCount: 0, bestPlanetId: Infinity };
      const cmp = compareBridgeScores(va, vb);
      if (cmp !== 0) return cmp;
    }
    return 0;
  };

  /**
   * Build BridgeDesc array for selected far bridge gates, ordered by priority.
   * For multi-harmonic gates, picks the harmonic that best bridges components.
   */
  const buildFarBridgeDescs = (
    selectedGates: number[],
    candidates: Map<number, Array<{ c1: number; c2: number; harmonicGate: number; harmonicIndex: number }>>,
    components: Set<number>[]
  ): BridgeDesc[] => {
    const descs: Array<BridgeDesc & { _score: BridgeScore }> = [];

    for (const missingGate of selectedGates) {
      const edges = candidates.get(missingGate) ?? [];
      if (edges.length === 0) continue;

      const traitInfo = gateTraits[missingGate];
      if (!traitInfo) continue;

      // Pick the best harmonic (lowest score = highest priority)
      // For ties, prefer the one that connects different components
      let bestEdge = edges[0];
      let bestScore = scoreBridgeDetailed(missingGate, bestEdge.harmonicGate);

      for (let i = 1; i < edges.length; i++) {
        const score = scoreBridgeDetailed(missingGate, edges[i].harmonicGate);
        const cmp = compareBridgeScores(score, bestScore);
        if (cmp < 0) {
          bestScore = score;
          bestEdge = edges[i];
        } else if (cmp === 0) {
          // Tiebreak: prefer edge that bridges different components
          const bridgesDifferent = (e: typeof bestEdge) => {
            for (const comp of components) {
              if (comp.has(e.c1) && !comp.has(e.c2)) return true;
              if (comp.has(e.c2) && !comp.has(e.c1)) return true;
            }
            return false;
          };
          if (!bridgesDifferent(bestEdge) && bridgesDifferent(edges[i])) {
            bestEdge = edges[i];
          }
        }
      }

      // Build the BridgeDesc
      if (Array.isArray(traitInfo.harmonicGate)) {
        const idx = bestEdge.harmonicIndex;
        const descriptions = bridgeDescriptions[bestEdge.harmonicGate];
        descs.push({
          gate: missingGate,
          trait: traitInfo.trait,
          harmonicGate: bestEdge.harmonicGate,
          harmonicTrait: (traitInfo.harmonicTrait as string[])[idx],
          strength: (traitInfo.strength as string[])[idx],
          description: Array.isArray(descriptions) ? descriptions[idx] : descriptions,
          _score: bestScore,
        });
      } else {
        const description = bridgeDescriptions[bestEdge.harmonicGate];
        descs.push({
          gate: missingGate,
          trait: traitInfo.trait,
          harmonicGate: bestEdge.harmonicGate,
          harmonicTrait: traitInfo.harmonicTrait as string,
          strength: traitInfo.strength as string,
          description: Array.isArray(description) ? description[0] : description,
          _score: bestScore,
        });
      }
    }

    // Sort by priority score (lower = higher priority)
    descs.sort((a, b) => compareBridgeScores(a._score, b._score));

    // Strip internal _score field
    return descs.map(({ _score, ...rest }) => rest);
  };

  /**
   * Get the top-priority bridge using unified scoring.
   * Scores all bridges with scoreBridgeDetailed() and picks the best one.
   * Generates an annotation describing why the winner was chosen.
   *
   * Returns the winning bridge and an annotation describing why.
   */
  const getTopBridge = (): { bridge: BridgeDesc; annotation: string } | null => {
    const nearBridges = getBridgeDescriptions();
    const wideBridges = getFarBridgeDescriptions();
    const channelBridges = getChannelBridgeDescriptions();
    const all = [...nearBridges, ...wideBridges, ...channelBridges];

    if (all.length === 0) return null;
    if (all.length === 1) return { bridge: all[0], annotation: '' };

    const planets = chart.planets ?? [];

    // Score each bridge and sort
    const scored = all.map(bridge => ({
      bridge,
      score: scoreBridgeDetailed(bridge.gate, bridge.harmonicGate),
    }));
    scored.sort((a, b) => compareBridgeScores(a.score, b.score));

    const winner = scored[0];

    // Generate annotation from the winning bridge's score properties
    const annotations: string[] = [];
    const planetBodyNames = ['Sun', 'Earth', 'North Node', 'South Node', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

    if (winner.score.tier === 1) {
      const sunPlanet = planets.find(p => p.gate === winner.bridge.harmonicGate && p.id === 0);
      const side = sunPlanet?.activation === 1 ? 'personality' : 'design';
      annotations.push(`${side} Sun`);
    } else if (winner.score.tier === 2) {
      const earthPlanet = planets.find(p => p.gate === winner.bridge.harmonicGate && p.id === 1);
      const side = earthPlanet?.activation === 1 ? 'personality' : 'design';
      annotations.push(`${side} Earth`);
    } else if (winner.score.tier === 3) {
      // Find which stream it completes
      const definedChannelPairs = new Set<string>();
      for (const channelIndex of chart.channels ?? []) {
        if (channelIndex >= 0 && channelIndex < channelStrengths.length) {
          const gates = channelStrengths[channelIndex].gates;
          definedChannelPairs.add([gates[0], gates[1]].sort((a, b) => a - b).join(','));
        }
      }
      const bridgeKey = [winner.bridge.gate, winner.bridge.harmonicGate].sort((a, b) => a - b).join(',');
      for (const stream of awarenessStreams) {
        const streamKeys = stream.channels.map(ch => [...ch].sort((a, b) => a - b).join(','));
        if (!streamKeys.includes(bridgeKey)) continue;
        if (streamKeys.filter(k => k !== bridgeKey).every(k => definedChannelPairs.has(k))) {
          annotations.push(`completes ${stream.name} stream`);
          break;
        }
      }
    } else if (winner.score.tier === 4) {
      annotations.push('Sun/Earth (non-exclusive)');
    }

    // Add activation/planet annotation if it was a deciding factor
    if (scored.length > 1 && scored[1].score.tier === winner.score.tier) {
      if (winner.score.activationCount > scored[1].score.activationCount) {
        annotations.push(`${winner.score.activationCount} activation${winner.score.activationCount !== 1 ? 's' : ''}`);
      } else if (winner.score.activationCount === scored[1].score.activationCount
        && winner.score.bestPlanetId < scored[1].score.bestPlanetId) {
        const harmonicPlanet = planets.find(p => p.gate === winner.bridge.harmonicGate && p.id === winner.score.bestPlanetId);
        const side = harmonicPlanet?.activation === 1 ? 'personality' : 'design';
        annotations.push(`${side} ${planetBodyNames[winner.score.bestPlanetId] ?? `planet ${winner.score.bestPlanetId}`}`);
      }
    }

    return {
      bridge: winner.bridge,
      annotation: annotations.length > 0 ? annotations.join(', ') : 'no priority',
    };
  };

  /**
   * Get the top bridge pair for 2W splits.
   * For wide splits, two bridges are needed to connect all components.
   * Uses the same scoring as single-bridge ranking:
   *   1. Harmonic exclusivity (lower = better) — pair-level
   *   2. Per-bridge BridgeScore tuples (lexicographic) — bridge-level
   *
   * Returns null if not a 2W split or if no valid pair found.
   */
  const getTopBridgePair = (): { bridges: [BridgeDesc, BridgeDesc]; annotation: string } | null => {
    if (splitType() !== '2W') return null;

    const components = findDefinedComponents();
    if (components.length <= 1) return null;

    // Collect all candidate bridges (far gates + channel bridges)
    const farBridges = getFarBridgeDescriptions();
    const channelBridges = getChannelBridgeDescriptions();
    const all = [...farBridges, ...channelBridges];

    if (all.length < 2) return null;

    const planets = chart.planets ?? [];

    // Generate all valid 2-element combinations that connect all components
    const validPairs: Array<[BridgeDesc, BridgeDesc]> = [];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const edges: Array<{ c1: number; c2: number }> = [];
        for (const bridge of [all[i], all[j]]) {
          const c1 = gateToCenter[bridge.gate];
          const c2 = gateToCenter[bridge.harmonicGate];
          if (c1 !== undefined && c2 !== undefined) {
            edges.push({ c1, c2 });
          }
        }
        if (edges.length >= 2 && connectsAllComponents(components, edges)) {
          validPairs.push([all[i], all[j]]);
        }
      }
    }

    if (validPairs.length === 0) return null;
    if (validPairs.length === 1) {
      return { bridges: validPairs[0], annotation: '' };
    }

    // Score each pair using the same exclusivity + BridgeScore system as rankBridgeSets
    const getPairExclusivity = (pair: [BridgeDesc, BridgeDesc]): number => {
      let total = 0;
      for (const bridge of pair) {
        const harmonicTraitInfo = gateTraits[bridge.harmonicGate];
        if (harmonicTraitInfo && Array.isArray(harmonicTraitInfo.harmonicGate)) {
          total += harmonicTraitInfo.harmonicGate.length;
        } else {
          total += 1;
        }
      }
      return total;
    };

    const getPairScores = (pair: [BridgeDesc, BridgeDesc]): BridgeScore[] => {
      return pair
        .map(b => scoreBridgeDetailed(b.gate, b.harmonicGate))
        .sort(compareBridgeScores);
    };

    let bestPair = validPairs[0];
    let bestExcl = getPairExclusivity(bestPair);
    let bestScores = getPairScores(bestPair);

    for (let i = 1; i < validPairs.length; i++) {
      const excl = getPairExclusivity(validPairs[i]);
      const scores = getPairScores(validPairs[i]);

      if (excl < bestExcl) {
        bestPair = validPairs[i];
        bestExcl = excl;
        bestScores = scores;
      } else if (excl === bestExcl && compareBridgeScoreArrays(scores, bestScores) < 0) {
        bestPair = validPairs[i];
        bestExcl = excl;
        bestScores = scores;
      }
    }

    // Generate annotation from winning pair's best bridge score
    const annotations: string[] = [];
    const winnerScore = bestScores[0]; // best individual bridge score in pair

    if (winnerScore.tier === 1) {
      const bridge = bestPair.find(b => scoreBridgeDetailed(b.gate, b.harmonicGate).tier === 1)!;
      const sunPlanet = planets.find(p => p.gate === bridge.harmonicGate && p.id === 0);
      const side = sunPlanet?.activation === 1 ? 'personality' : 'design';
      annotations.push(`${side} Sun`);
    } else if (winnerScore.tier === 2) {
      const bridge = bestPair.find(b => scoreBridgeDetailed(b.gate, b.harmonicGate).tier === 2)!;
      const earthPlanet = planets.find(p => p.gate === bridge.harmonicGate && p.id === 1);
      const side = earthPlanet?.activation === 1 ? 'personality' : 'design';
      annotations.push(`${side} Earth`);
    } else if (winnerScore.tier === 3) {
      // Find which stream the winning bridge completes
      const bridge = bestPair.find(b => scoreBridgeDetailed(b.gate, b.harmonicGate).tier === 3)!;
      const definedChannelPairs = new Set<string>();
      for (const channelIndex of chart.channels ?? []) {
        if (channelIndex >= 0 && channelIndex < channelStrengths.length) {
          const gates = channelStrengths[channelIndex].gates;
          definedChannelPairs.add([gates[0], gates[1]].sort((a, b) => a - b).join(','));
        }
      }
      const bridgeKey = [bridge.gate, bridge.harmonicGate].sort((a, b) => a - b).join(',');
      for (const stream of awarenessStreams) {
        const streamKeys = stream.channels.map(ch => [...ch].sort((a, b) => a - b).join(','));
        if (streamKeys.includes(bridgeKey) && streamKeys.filter(k => k !== bridgeKey).every(k => definedChannelPairs.has(k))) {
          annotations.push(`completes ${stream.name} stream`);
          break;
        }
      }
    } else if (winnerScore.tier === 4) {
      annotations.push('Sun/Earth (non-exclusive)');
    }

    return {
      bridges: bestPair,
      annotation: annotations.length > 0 ? annotations.join(', ') : '',
    };
  };

  /**
   * Get all bridges (near + far) sorted by the unified scoring system.
   * Uses scoreBridgeDetailed() + compareBridgeScores() for consistent ordering.
   */
  const getAllBridgesSorted = (): BridgeDesc[] => {
    const near = getBridgeDescriptions();
    const far = getFarBridgeDescriptions();
    const channel = getChannelBridgeDescriptions();
    const all = [...near, ...far, ...channel];

    if (all.length <= 1) return all;

    const scored = all.map(bridge => ({
      ...bridge,
      _score: scoreBridgeDetailed(bridge.gate, bridge.harmonicGate),
    }));
    scored.sort((a, b) => compareBridgeScores(a._score, b._score));

    return scored.map(({ _score, ...rest }) => rest);
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

    // Strength functions
    getStrengths,

    // Shadow functions
    hasBringingTraitsShadow,
    getShadows,
    getBridgeDescriptions,
    getFarBridgeDescriptions,
    getChannelBridgeDescriptions,
    getTopBridge,
    getTopBridgePair,
    getAllBridgesSorted,
    hasNearBridges,
    hasFarBridges,
    hasChannelBridges,
    splitType,
    findDefinedComponents,
  };
}
