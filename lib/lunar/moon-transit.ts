/**
 * Moon transit calculator for a Reflector's lunar cycle.
 *
 * Samples Moon ecliptic longitude every 30 minutes for ~29 days,
 * detects gate transitions, and for each transit computes which
 * channels complete and what energy type results.
 */

import julian from 'astronomia/julian';
import moonposition from 'astronomia/moonposition';

import { gateAtLongitude } from './gate-wheel';
import { findCompletedChannels, type CompletedChannel } from './channel-completion';
import { determineType, getDefinedCenters } from './type-determination';

/** A single Moon transit through one HD gate. */
export interface MoonTransit {
  /** Gate number (1-64) */
  gate: number;
  /** When the Moon enters this gate (UTC) */
  enterTime: Date;
  /** When the Moon exits this gate (UTC) */
  exitTime: Date;
  /** Channels completed by this transit combined with natal gates */
  completedChannels: CompletedChannel[];
  /** Center indices that become defined during this transit */
  definedCenters: number[];
  /** The resulting energy type during this transit */
  resultingType: string;
}

/** Sampling interval in milliseconds (30 minutes). */
const SAMPLE_INTERVAL_MS = 30 * 60 * 1000;

/** Cycle duration in days (~29.5 day lunar cycle). */
const CYCLE_DAYS = 29;

/** Total number of samples. */
const TOTAL_SAMPLES = Math.ceil((CYCLE_DAYS * 24 * 60) / 30);

/**
 * Get the Moon's ecliptic longitude in degrees at a given Date.
 * Uses the astronomia library (Meeus Ch. 47 algorithms).
 */
function moonLongitudeDegrees(date: Date): number {
  const jde = julian.DateToJDE(date);
  const pos = moonposition.position(jde);
  // pos.lon is in radians; convert to degrees
  let degrees = (pos.lon * 180) / Math.PI;
  // Normalize to [0, 360)
  degrees = ((degrees % 360) + 360) % 360;
  return degrees;
}

/**
 * Calculate the full lunar cycle of Moon gate transits for a Reflector.
 *
 * @param startDate - When to begin the cycle (typically "now")
 * @param natalGates - The subscriber's natal gate activations (gate numbers)
 * @returns Array of MoonTransit objects covering ~29 days
 */
export function calculateLunarCycle(
  startDate: Date,
  natalGates: number[],
): MoonTransit[] {
  // Sample Moon positions
  const samples: Array<{ time: Date; gate: number }> = [];
  const startMs = startDate.getTime();

  for (let i = 0; i <= TOTAL_SAMPLES; i++) {
    const time = new Date(startMs + i * SAMPLE_INTERVAL_MS);
    const longitude = moonLongitudeDegrees(time);
    const { gate } = gateAtLongitude(longitude);
    samples.push({ time, gate });
  }

  // Detect gate transitions and build transit windows
  const transits: MoonTransit[] = [];
  let currentGate = samples[0].gate;
  let enterTime = samples[0].time;

  for (let i = 1; i < samples.length; i++) {
    if (samples[i].gate !== currentGate) {
      // Gate changed — close current transit and start a new one
      const completedChannels = findCompletedChannels(currentGate, natalGates);
      const definedCenters = getDefinedCenters(completedChannels);
      const resultingType = determineType(completedChannels);

      transits.push({
        gate: currentGate,
        enterTime,
        exitTime: samples[i].time,
        completedChannels,
        definedCenters,
        resultingType,
      });

      currentGate = samples[i].gate;
      enterTime = samples[i].time;
    }
  }

  // Close the final transit
  const lastSample = samples[samples.length - 1];
  const completedChannels = findCompletedChannels(currentGate, natalGates);
  const definedCenters = getDefinedCenters(completedChannels);
  const resultingType = determineType(completedChannels);

  transits.push({
    gate: currentGate,
    enterTime,
    exitTime: lastSample.time,
    completedChannels,
    definedCenters,
    resultingType,
  });

  return transits;
}
