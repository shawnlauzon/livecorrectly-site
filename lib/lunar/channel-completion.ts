/**
 * Channel completion logic for Moon transits.
 *
 * Given a Moon gate and a set of natal gates, finds which channels are completed
 * (the Moon provides one gate and the natal chart provides the other).
 */

import { channelStrengths, gateToCenter, centerNames } from '@/lib/hd-chart/constants';

export interface CompletedChannel {
  /** Channel name (e.g., "Charisma") */
  name: string;
  /** Thematic group (e.g., "Empowerment") */
  thematic: string;
  /** The two gates forming the channel, as [gate1, gate2] */
  gates: readonly [number, number];
  /** The two center indices connected by this channel */
  centers: [number, number];
  /** Human-readable center names */
  centerNames: [string, string];
}

/**
 * Find all channels completed when the Moon activates a given gate,
 * combined with the subscriber's natal gate activations.
 *
 * A channel is completed when one gate comes from the Moon and the other
 * from the natal chart. Multi-harmonic gates (10, 20, 34, 57) can complete
 * multiple channels simultaneously.
 *
 * @param moonGate - The gate the Moon is currently activating
 * @param natalGates - Array of gate numbers from the subscriber's natal chart
 * @returns All channels completed by this Moon transit
 */
export function findCompletedChannels(
  moonGate: number,
  natalGates: number[],
): CompletedChannel[] {
  const natalGateSet = new Set(natalGates);
  const completed: CompletedChannel[] = [];

  for (const channel of channelStrengths) {
    const [gateA, gateB] = channel.gates;

    // Check if Moon provides one gate and natal chart provides the other
    const moonProvidesA = moonGate === gateA && natalGateSet.has(gateB);
    const moonProvidesB = moonGate === gateB && natalGateSet.has(gateA);

    if (moonProvidesA || moonProvidesB) {
      const centerA = gateToCenter[gateA];
      const centerB = gateToCenter[gateB];

      completed.push({
        name: channel.name,
        thematic: channel.thematic,
        gates: channel.gates,
        centers: [centerA, centerB],
        centerNames: [centerNames[centerA], centerNames[centerB]],
      });
    }
  }

  return completed;
}
