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
        const matchingHarmonicIndex = missingTraitInfo.harmonicGate.findIndex(
          hGate => userGates.includes(hGate)
        );

        if (matchingHarmonicIndex >= 0) {
          const harmonicGateTheyHave = missingTraitInfo.harmonicGate[matchingHarmonicIndex];
          const descriptions = bridgeDescriptions[harmonicGateTheyHave];
          return {
            gate: missingGate,
            trait: missingTraitInfo.trait,
            harmonicGate: harmonicGateTheyHave,
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

    // Check if adding a set of bridge edges connects all components
    const connectsAllComponents = (
      comps: Set<number>[],
      edges: Array<{ c1: number; c2: number }>
    ): boolean => {
      // Union-Find for component merging
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
        // Both endpoints might be in defined components, or one/both might be
        // undefined centers acting as waypoints. Bridge channels connect through
        // intermediary undefined centers.
        const comp1 = centerToComp.get(edge.c1);
        const comp2 = centerToComp.get(edge.c2);

        if (comp1 !== undefined && comp2 !== undefined) {
          // Both endpoints are in defined components — direct merge
          union(comp1, comp2);
        } else if (comp1 !== undefined || comp2 !== undefined) {
          // One endpoint is in a defined component, the other is undefined.
          // The undefined center becomes a waypoint — assign it to the known component
          // so future edges through it can chain.
          const definedComp = comp1 ?? comp2!;
          const undefinedCenter = comp1 !== undefined ? edge.c2 : edge.c1;
          centerToComp.set(undefinedCenter, definedComp);
        } else {
          // Neither endpoint is in any component yet — both undefined centers.
          // Create a temporary group for chaining.
          const tempIdx = parent.length;
          parent.push(tempIdx);
          centerToComp.set(edge.c1, tempIdx);
          centerToComp.set(edge.c2, tempIdx);
        }
      }

      // Re-run unions after all waypoints are assigned (edges may need re-evaluation)
      for (const edge of edges) {
        const comp1 = centerToComp.get(edge.c1);
        const comp2 = centerToComp.get(edge.c2);
        if (comp1 !== undefined && comp2 !== undefined) {
          union(comp1, comp2);
        }
      }

      // Check if all original components are now in one group
      const roots = new Set<number>();
      for (let i = 0; i < comps.length; i++) {
        roots.add(find(i));
      }
      return roots.size === 1;
    };

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
   * Score a bridge (missing gate + harmonic) using the 4-tier priority system:
   * 1 (highest): Sun activates the harmonic exclusively
   * 2: Earth activates the harmonic exclusively
   * 3: Bridge completes an awareness stream
   * 4: Sun/Earth activates the harmonic non-exclusively
   * 5 (default): No special priority
   */
  const scoreBridge = (missingGate: number, harmonicGate: number): number => {
    const planets = chart.planets ?? [];
    const userGates = chart.gates.map(g => g.gate);

    // Count how many harmonics the person has for this missing gate
    const traitInfo = gateTraits[missingGate];
    let harmonicCount = 1;
    if (traitInfo && Array.isArray(traitInfo.harmonicGate)) {
      harmonicCount = traitInfo.harmonicGate.filter(hg => userGates.includes(hg)).length;
    }
    const isExclusive = harmonicCount <= 1;

    // Check Sun/Earth activation on the harmonic gate
    let hasSun = false;
    let hasEarth = false;
    for (const p of planets) {
      if (p.gate !== harmonicGate) continue;
      if (p.id === 0) hasSun = true;
      if (p.id === 1) hasEarth = true;
    }

    if (hasSun && isExclusive) return 1;
    if (hasEarth && isExclusive) return 2;

    // Check stream completion
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
      if (others.every(key => definedChannelPairs.has(key))) return 3;
    }

    if ((hasSun || hasEarth) && !isExclusive) return 4;

    return 5;
  };

  /**
   * Rank multiple valid bridge sets and return the best one.
   * Compares sets by their best bridge scores (lexicographic comparison).
   */
  const rankBridgeSets = (
    validSets: number[][],
    candidates: Map<number, Array<{ c1: number; c2: number; harmonicGate: number; harmonicIndex: number }>>
  ): number[] => {
    if (validSets.length === 1) return validSets[0];

    let bestSet = validSets[0];
    let bestScores = getBestScoresForSet(bestSet, candidates);

    for (let i = 1; i < validSets.length; i++) {
      const scores = getBestScoresForSet(validSets[i], candidates);
      if (compareScoreArrays(scores, bestScores) < 0) {
        bestSet = validSets[i];
        bestScores = scores;
      }
    }

    return bestSet;
  };

  /**
   * Get the best priority score for each gate in a set,
   * sorted ascending (best first).
   */
  const getBestScoresForSet = (
    gates: number[],
    candidates: Map<number, Array<{ c1: number; c2: number; harmonicGate: number; harmonicIndex: number }>>
  ): number[] => {
    return gates
      .map(gate => {
        const edges = candidates.get(gate) ?? [];
        return Math.min(...edges.map(e => scoreBridge(gate, e.harmonicGate)));
      })
      .sort((a, b) => a - b);
  };

  /**
   * Lexicographic comparison of two score arrays (lower = better).
   */
  const compareScoreArrays = (a: number[], b: number[]): number => {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const va = a[i] ?? Infinity;
      const vb = b[i] ?? Infinity;
      if (va !== vb) return va - vb;
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
    const descs: Array<BridgeDesc & { _score: number }> = [];

    for (const missingGate of selectedGates) {
      const edges = candidates.get(missingGate) ?? [];
      if (edges.length === 0) continue;

      const traitInfo = gateTraits[missingGate];
      if (!traitInfo) continue;

      // Pick the best harmonic (lowest score = highest priority)
      // For ties, prefer the one that connects different components
      let bestEdge = edges[0];
      let bestScore = scoreBridge(missingGate, bestEdge.harmonicGate);

      for (let i = 1; i < edges.length; i++) {
        const score = scoreBridge(missingGate, edges[i].harmonicGate);
        if (score < bestScore) {
          bestScore = score;
          bestEdge = edges[i];
        } else if (score === bestScore) {
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
    descs.sort((a, b) => a._score - b._score);

    // Strip internal _score field
    return descs.map(({ _score, ...rest }) => rest);
  };

  /**
   * Prioritize bridging gates using a 4-tier system:
   * 1. Sun bridge (exclusive) — Sun activates the ONLY harmonic the person has for this bridge
   * 2. Earth bridge (exclusive) — Earth activates the ONLY harmonic the person has for this bridge
   * 3. Stream completion — completing that bridge would complete an awareness stream
   * 4. Sun/Earth bridge (non-exclusive) — Sun/Earth activates a harmonic, but other harmonics
   *    for the same missing gate also exist in the chart (lower value)
   *
   * For single-harmonic gates, the harmonic is always exclusive by definition,
   * so Sun/Earth is always tier 1/2 if present.
   *
   * A single bridge can appear in multiple lists. The consumer picks the
   * highest-priority list that has entries.
   */
  const getBridgePriority = (): {
    sunBridges: Array<{ bridge: BridgeDesc; planet: 'personality' | 'design' }>;
    earthBridges: Array<{ bridge: BridgeDesc; planet: 'personality' | 'design' }>;
    streamBridges: Array<{ bridge: BridgeDesc; stream: string }>;
    nonExclusiveSunEarthBridges: Array<{ bridge: BridgeDesc; planet: 'personality' | 'design'; body: 'Sun' | 'Earth' }>;
    allBridges: BridgeDesc[];
  } => {
    const allBridges = getBridgeDescriptions();
    if (allBridges.length === 0) {
      return { sunBridges: [], earthBridges: [], streamBridges: [], nonExclusiveSunEarthBridges: [], allBridges };
    }

    const planets = chart.planets ?? [];
    const userGates = chart.gates.map(g => g.gate);

    // --- Sun / Earth detection with exclusivity check ---
    const sunBridges: Array<{ bridge: BridgeDesc; planet: 'personality' | 'design' }> = [];
    const earthBridges: Array<{ bridge: BridgeDesc; planet: 'personality' | 'design' }> = [];
    const nonExclusiveSunEarthBridges: Array<{ bridge: BridgeDesc; planet: 'personality' | 'design'; body: 'Sun' | 'Earth' }> = [];

    for (const bridge of allBridges) {
      // Count how many harmonics the person has for this missing gate
      const missingTraitInfo = gateTraits[bridge.gate];
      let harmonicCount = 1; // single-harmonic gates always have exactly 1
      if (missingTraitInfo && Array.isArray(missingTraitInfo.harmonicGate)) {
        harmonicCount = missingTraitInfo.harmonicGate.filter(hg => userGates.includes(hg)).length;
      }
      const isExclusive = harmonicCount <= 1;

      // Find planets that activate the harmonic gate the person HAS
      for (const p of planets) {
        if (p.gate !== bridge.harmonicGate) continue;
        const side: 'personality' | 'design' = p.activation === 1 ? 'personality' : 'design';
        if (p.id === 0) {
          if (isExclusive) {
            sunBridges.push({ bridge, planet: side });
          } else {
            nonExclusiveSunEarthBridges.push({ bridge, planet: side, body: 'Sun' });
          }
        } else if (p.id === 1) {
          if (isExclusive) {
            earthBridges.push({ bridge, planet: side });
          } else {
            nonExclusiveSunEarthBridges.push({ bridge, planet: side, body: 'Earth' });
          }
        }
      }
    }

    // --- Stream completion detection ---
    const definedChannelPairs = new Set<string>();
    for (const channelIndex of chart.channels ?? []) {
      if (channelIndex >= 0 && channelIndex < channelStrengths.length) {
        const gates = channelStrengths[channelIndex].gates;
        const key = [gates[0], gates[1]].sort((a, b) => a - b).join(',');
        definedChannelPairs.add(key);
      }
    }

    const streamBridges: Array<{ bridge: BridgeDesc; stream: string }> = [];

    for (const bridge of allBridges) {
      const bridgeChannelKey = [bridge.gate, bridge.harmonicGate]
        .sort((a, b) => a - b)
        .join(',');

      for (const stream of awarenessStreams) {
        const streamChannelKeys = stream.channels.map(
          (ch) => [...ch].sort((a, b) => a - b).join(',')
        );

        if (!streamChannelKeys.includes(bridgeChannelKey)) continue;

        const otherChannels = streamChannelKeys.filter(
          (key) => key !== bridgeChannelKey
        );
        const allOthersDefined = otherChannels.every((key) =>
          definedChannelPairs.has(key)
        );

        if (allOthersDefined) {
          streamBridges.push({ bridge, stream: stream.name });
        }
      }
    }

    return { sunBridges, earthBridges, streamBridges, nonExclusiveSunEarthBridges, allBridges };
  };

  /**
   * Get the top-priority bridge(s) using progressive filtering.
   * Each tier narrows the candidate pool (keeps filtering, doesn't restart).
   *
   * Tiers:
   * 1. Sun exclusive — harmonic gate activated by Sun, exclusive harmonic
   * 2. Earth exclusive — harmonic gate activated by Earth, exclusive harmonic
   * 3. Stream completion — bridge would complete an awareness stream
   * 4. Sun/Earth non-exclusive — Sun/Earth activates harmonic, but multiple harmonics exist
   * 5. Most planetary activations on harmonic gate
   * 6. Most important planet (lowest id) on harmonic gate
   *
   * Returns the winning bridge(s) and an annotation describing why.
   */
  const getTopBridge = (): { bridge: BridgeDesc; annotation: string } | null => {
    const nearBridges = getBridgeDescriptions();
    const wideBridges = getFarBridgeDescriptions();
    const all = [...nearBridges, ...wideBridges];

    if (all.length === 0) return null;
    if (all.length === 1) return { bridge: all[0], annotation: '' };

    const planets = chart.planets ?? [];
    const userGates = chart.gates.map(g => g.gate);

    // Annotate each bridge with priority properties
    const annotated = all.map(bridge => {
      const traitInfo = gateTraits[bridge.gate];
      let harmonicCount = 1;
      if (traitInfo && Array.isArray(traitInfo.harmonicGate)) {
        harmonicCount = traitInfo.harmonicGate.filter(hg => userGates.includes(hg)).length;
      }
      const exclusive = harmonicCount <= 1;

      const harmonicPlanets = planets.filter(p => p.gate === bridge.harmonicGate);

      let hasSun = false, sunSide: 'personality' | 'design' = 'personality';
      let hasEarth = false, earthSide: 'personality' | 'design' = 'personality';
      for (const p of harmonicPlanets) {
        const side: 'personality' | 'design' = p.activation === 1 ? 'personality' : 'design';
        if (p.id === 0) { hasSun = true; sunSide = side; }
        if (p.id === 1) { hasEarth = true; earthSide = side; }
      }

      // Stream check
      const definedChannelPairs = new Set<string>();
      for (const channelIndex of chart.channels ?? []) {
        if (channelIndex >= 0 && channelIndex < channelStrengths.length) {
          const gates = channelStrengths[channelIndex].gates;
          definedChannelPairs.add([gates[0], gates[1]].sort((a, b) => a - b).join(','));
        }
      }
      let completesStream: string | null = null;
      const bridgeKey = [bridge.gate, bridge.harmonicGate].sort((a, b) => a - b).join(',');
      for (const stream of awarenessStreams) {
        const streamKeys = stream.channels.map(ch => [...ch].sort((a, b) => a - b).join(','));
        if (!streamKeys.includes(bridgeKey)) continue;
        if (streamKeys.filter(k => k !== bridgeKey).every(k => definedChannelPairs.has(k))) {
          completesStream = stream.name;
          break;
        }
      }

      return {
        bridge,
        sunExclusive: hasSun && exclusive,
        sunSide,
        earthExclusive: hasEarth && exclusive,
        earthSide,
        completesStream,
        nonExclusiveSunEarth: (hasSun || hasEarth) && !exclusive,
        activationCount: harmonicPlanets.length,
        bestPlanetId: harmonicPlanets.length > 0 ? Math.min(...harmonicPlanets.map(p => p.id)) : Infinity,
      };
    });

    let candidates = annotated;
    const annotations: string[] = [];

    // Tier 1: Sun exclusive
    const sunFiltered = candidates.filter(a => a.sunExclusive);
    if (sunFiltered.length > 0 && sunFiltered.length < candidates.length) {
      candidates = sunFiltered;
      annotations.push(`${candidates[0].sunSide} Sun`);
    }

    // Tier 2: Earth exclusive
    if (candidates.length > 1) {
      const earthFiltered = candidates.filter(a => a.earthExclusive);
      if (earthFiltered.length > 0 && earthFiltered.length < candidates.length) {
        candidates = earthFiltered;
        annotations.push(`${candidates[0].earthSide} Earth`);
      }
    }

    // Tier 3: Stream completion
    if (candidates.length > 1) {
      const streamFiltered = candidates.filter(a => a.completesStream !== null);
      if (streamFiltered.length > 0 && streamFiltered.length < candidates.length) {
        candidates = streamFiltered;
        annotations.push(`completes ${candidates[0].completesStream} stream`);
      }
    }

    // Tier 4: Non-exclusive Sun/Earth
    if (candidates.length > 1) {
      const neFiltered = candidates.filter(a => a.nonExclusiveSunEarth);
      if (neFiltered.length > 0 && neFiltered.length < candidates.length) {
        candidates = neFiltered;
        annotations.push('Sun/Earth (non-exclusive)');
      }
    }

    // Tier 5: Most activations on harmonic gate
    if (candidates.length > 1) {
      const maxAct = Math.max(...candidates.map(a => a.activationCount));
      const actFiltered = candidates.filter(a => a.activationCount === maxAct);
      if (actFiltered.length < candidates.length) {
        candidates = actFiltered;
        annotations.push(`${maxAct} activation${maxAct !== 1 ? 's' : ''}`);
      }
    }

    // Tier 6: Most important planet (lowest id) on harmonic gate
    const planetBodyNames = ['Sun', 'Earth', 'North Node', 'South Node', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    if (candidates.length > 1) {
      const bestId = Math.min(...candidates.map(a => a.bestPlanetId));
      const planetFiltered = candidates.filter(a => a.bestPlanetId === bestId);
      if (planetFiltered.length < candidates.length) {
        candidates = planetFiltered;
        // Find which side this planet is on for the winner
        const winner = candidates[0];
        const winnerPlanet = planets.find(p => p.gate === winner.bridge.harmonicGate && p.id === bestId);
        const side = winnerPlanet?.activation === 1 ? 'personality' : 'design';
        annotations.push(`${side} ${planetBodyNames[bestId] ?? `planet ${bestId}`}`);
      }
    }

    return {
      bridge: candidates[0].bridge,
      annotation: annotations.length > 0 ? annotations.join(', ') : 'no priority',
    };
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
    getBridgePriority,
    getTopBridge,
    hasNearBridges,
    hasFarBridges,
    findDefinedComponents,
  };
}
