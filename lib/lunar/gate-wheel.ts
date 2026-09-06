/**
 * HD Mandala gate-to-ecliptic-degree mapping.
 *
 * The mandala maps 64 gates to the 360° ecliptic circle. Each gate spans
 * exactly 5.625° (360/64) and each line within a gate spans 0.9375° (5.625/6).
 *
 * The gate sequence follows the I Ching King Wen arrangement on the zodiac,
 * starting from the Rave Mandala offset of 3.875° (3° 52' 30") past 0° Aries.
 */

/** Offset of the HD mandala from the tropical zodiac, in degrees. */
const MANDALA_OFFSET = 3.875;

/** Degrees per gate (360 / 64). */
const DEGREES_PER_GATE = 5.625;

/** Degrees per line (5.625 / 6). */
const DEGREES_PER_LINE = DEGREES_PER_GATE / 6;

/**
 * The 64 HD gates in mandala order, starting from the offset (0° Aries + 3.875°).
 * Index 0 = gate 17, which starts at 3.875° ecliptic longitude.
 */
export const GATE_SEQUENCE: readonly number[] = [
  17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15,
  52, 39, 53, 62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46,
  18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10,
  58, 38, 54, 61, 60, 41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25,
] as const;

/** Reverse lookup: gate number → index in GATE_SEQUENCE. */
const gateToIndex: Map<number, number> = new Map();
for (let i = 0; i < GATE_SEQUENCE.length; i++) {
  gateToIndex.set(GATE_SEQUENCE[i], i);
}

/**
 * Normalize an ecliptic longitude to [0, 360).
 */
function normalizeLongitude(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Convert an ecliptic longitude (in degrees) to an HD gate and line.
 *
 * @param degrees - Ecliptic longitude in degrees (0-360)
 * @returns The gate number (1-64) and line (1-6)
 */
export function gateAtLongitude(degrees: number): { gate: number; line: number } {
  const normalized = normalizeLongitude(degrees);

  // Degrees past the mandala start
  const degreesFromStart = normalizeLongitude(normalized - MANDALA_OFFSET);

  const gateIndex = Math.floor(degreesFromStart / DEGREES_PER_GATE);
  const degreesIntoGate = degreesFromStart - gateIndex * DEGREES_PER_GATE;
  const line = Math.floor(degreesIntoGate / DEGREES_PER_LINE) + 1;

  return {
    gate: GATE_SEQUENCE[gateIndex],
    line: Math.min(line, 6), // clamp to 6 in case of floating point edge
  };
}

/**
 * Get the ecliptic longitude range for a given gate.
 *
 * @param gate - Gate number (1-64)
 * @returns Start and end longitudes in degrees [start, end), both in [0, 360)
 */
export function gateLongitudeRange(gate: number): { start: number; end: number } {
  const index = gateToIndex.get(gate);
  if (index === undefined) {
    throw new Error(`Invalid gate number: ${gate}`);
  }
  const start = normalizeLongitude(MANDALA_OFFSET + index * DEGREES_PER_GATE);
  const end = normalizeLongitude(start + DEGREES_PER_GATE);
  return { start, end };
}
