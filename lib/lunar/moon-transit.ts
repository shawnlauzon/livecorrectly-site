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

/** A subscriber-independent gate boundary (the expensive, cacheable part). */
interface GateTransition {
  gate: number;
  enterTime: Date;
  exitTime: Date;
}

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

/** Default cycle duration in days (~29.5 day lunar cycle). */
const DEFAULT_CYCLE_DAYS = 29;

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
 * Binary-search between two timestamps to find the gate transition to ~1-minute precision.
 * Starting from a 30-min bracket where fromGate is at earlierMs and a different gate is at laterMs,
 * halves the interval ~5 times to narrow down the boundary.
 *
 * @returns The refined timestamp (as Date) where the gate changes from fromGate.
 */
function refineTransitionTime(earlierMs: number, laterMs: number, fromGate: number): Date {
  const ONE_MINUTE = 60_000;
  let lo = earlierMs;
  let hi = laterMs;

  // ~5 iterations: 30min → 15 → 7.5 → 3.75 → 1.875 → ~0.94 min
  while (hi - lo > ONE_MINUTE) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const midDate = new Date(mid);
    const longitude = moonLongitudeDegrees(midDate);
    const { gate } = gateAtLongitude(longitude);

    if (gate === fromGate) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return new Date(hi);
}

/**
 * Module-level cache for gate transitions.
 * Moon gate boundaries are deterministic and identical for all subscribers —
 * only the channel completion varies per natal chart. Caching here avoids
 * repeating ~3200 moonLongitudeDegrees calls when multiple Reflectors
 * share the same date range.
 */
const gateTransitionCache = new Map<string, GateTransition[]>();

/**
 * Compute raw gate transition boundaries (the expensive, subscriber-independent part).
 * Results are cached in a module-level Map keyed by start timestamp + day count.
 */
function computeGateTransitions(startDate: Date, days: number): GateTransition[] {
  const startMs = startDate.getTime();
  const cacheKey = `${startMs}:${days}`;

  const cached = gateTransitionCache.get(cacheKey);
  if (cached) return cached;

  const totalSamples = Math.ceil((days * 24 * 60) / 30);

  // Sample Moon positions
  const samples: Array<{ time: Date; gate: number }> = [];

  for (let i = 0; i <= totalSamples; i++) {
    const time = new Date(startMs + i * SAMPLE_INTERVAL_MS);
    const longitude = moonLongitudeDegrees(time);
    const { gate } = gateAtLongitude(longitude);
    samples.push({ time, gate });
  }

  // Detect gate transitions and build boundaries
  const transitions: GateTransition[] = [];
  let currentGate = samples[0].gate;
  let enterTime = samples[0].time;

  for (let i = 1; i < samples.length; i++) {
    if (samples[i].gate !== currentGate) {
      const boundary = refineTransitionTime(
        samples[i - 1].time.getTime(),
        samples[i].time.getTime(),
        currentGate,
      );

      transitions.push({ gate: currentGate, enterTime, exitTime: boundary });
      currentGate = samples[i].gate;
      enterTime = boundary;
    }
  }

  // Close the final transition
  const lastSample = samples[samples.length - 1];
  transitions.push({ gate: currentGate, enterTime, exitTime: lastSample.time });

  gateTransitionCache.set(cacheKey, transitions);
  return transitions;
}

/**
 * Calculate the full lunar cycle of Moon gate transits for a Reflector.
 *
 * Delegates the expensive astronomical sampling to computeGateTransitions
 * (cached in-memory), then enriches each transition with per-subscriber
 * channel completion, defined centers, and resulting type.
 *
 * @param startDate - When to begin the cycle (typically "now")
 * @param natalGates - The subscriber's natal gate activations (gate numbers)
 * @param days - Number of days to compute (default ~29 for one lunar cycle)
 * @returns Array of MoonTransit objects covering the specified number of days
 */
export function calculateLunarCycle(
  startDate: Date,
  natalGates: number[],
  days: number = DEFAULT_CYCLE_DAYS,
): MoonTransit[] {
  const transitions = computeGateTransitions(startDate, days);

  return transitions.map((t) => {
    const completedChannels = findCompletedChannels(t.gate, natalGates);
    const definedCenters = getDefinedCenters(completedChannels);
    const resultingType = determineType(completedChannels);

    return {
      gate: t.gate,
      enterTime: t.enterTime,
      exitTime: t.exitTime,
      completedChannels,
      definedCenters,
      resultingType,
    };
  });
}
