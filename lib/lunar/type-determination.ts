/**
 * Type determination from completed channels.
 *
 * Given a set of completed channels (from Moon transits + natal gates),
 * determines the resulting energy type using the same rules the Maia API
 * uses for birth charts:
 *
 * 1. If Sacral is defined + Motor→Throat chain → "Express Builder"
 * 2. If Sacral is defined, no Motor→Throat → "Classic Builder"
 * 3. No Sacral, Motor→Throat chain → "Initiator"
 * 4. Some centers defined, no Sacral, no Motor→Throat → "Advisor"
 * 5. Nothing defined → "Evaluator"
 */

import type { CompletedChannel } from './channel-completion';

/** Center indices matching centerNames in constants.ts */
const CENTER = {
  ROOT: 0,
  SACRAL: 1,
  SPLEEN: 2,
  SOLAR_PLEXUS: 3,
  EGO: 4,
  G: 5,
  THROAT: 6,
  AJNA: 7,
  HEAD: 8,
} as const;

/** Motor centers that can drive manifestation through the Throat. */
const MOTOR_CENTERS = new Set([CENTER.ROOT, CENTER.SACRAL, CENTER.SOLAR_PLEXUS, CENTER.EGO]);

/**
 * Determine the energy type from a set of completed channels.
 *
 * @param completedChannels - Channels completed by the Moon transit + natal gates
 * @returns The resulting energy type name
 */
export function determineType(completedChannels: CompletedChannel[]): string {
  if (completedChannels.length === 0) {
    return 'Evaluator';
  }

  // Build a set of defined centers and an adjacency graph
  const definedCenters = new Set<number>();
  const adjacency = new Map<number, Set<number>>();

  for (const channel of completedChannels) {
    const [centerA, centerB] = channel.centers;
    definedCenters.add(centerA);
    definedCenters.add(centerB);

    if (!adjacency.has(centerA)) adjacency.set(centerA, new Set());
    if (!adjacency.has(centerB)) adjacency.set(centerB, new Set());
    adjacency.get(centerA)!.add(centerB);
    adjacency.get(centerB)!.add(centerA);
  }

  const sacralDefined = definedCenters.has(CENTER.SACRAL);
  const motorToThroat = hasMotorToThroatChain(adjacency, definedCenters);

  if (sacralDefined && motorToThroat) {
    return 'Express Builder';
  }
  if (sacralDefined) {
    return 'Classic Builder';
  }
  if (motorToThroat) {
    return 'Initiator';
  }
  return 'Advisor';
}

/**
 * BFS from any motor center to the Throat, traversing only defined centers.
 * For a Reflector with 1-3 channels completing at once, the graph is tiny.
 */
function hasMotorToThroatChain(
  adjacency: Map<number, Set<number>>,
  definedCenters: Set<number>,
): boolean {
  for (const motor of MOTOR_CENTERS) {
    if (!definedCenters.has(motor)) continue;

    // BFS from this motor center
    const visited = new Set<number>();
    const queue: number[] = [motor];
    visited.add(motor);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === CENTER.THROAT) return true;

      const neighbors = adjacency.get(current);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && definedCenters.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  return false;
}

/**
 * Get the set of defined center indices from completed channels.
 * Exported for the page to display which centers are active.
 */
export function getDefinedCenters(completedChannels: CompletedChannel[]): number[] {
  const centers = new Set<number>();
  for (const channel of completedChannels) {
    centers.add(channel.centers[0]);
    centers.add(channel.centers[1]);
  }
  return Array.from(centers).sort((a, b) => a - b);
}
