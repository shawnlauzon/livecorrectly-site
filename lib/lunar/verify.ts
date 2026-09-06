/**
 * Verification script — run with: npx tsx lib/lunar/verify.ts
 *
 * Tests:
 * 1. Gate wheel accuracy against fake-mmi-response.json planet data
 * 2. Type determination for known channel combinations
 * 3. Moon position sanity check
 */

import { gateAtLongitude } from './gate-wheel';
import { findCompletedChannels } from './channel-completion';
import { determineType } from './type-determination';
import julian from 'astronomia/julian';
import moonposition from 'astronomia/moonposition';
import fakeResponse from '../../public/fake-mmi-response.json';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

// ─── 1. Gate wheel accuracy ───────────────────────────────────────────

console.log('\n=== Gate Wheel Accuracy ===');
console.log('Testing planet activations from fake-mmi-response.json:');

for (const planet of fakeResponse.chart.planets) {
  const result = gateAtLongitude(planet.longitude);
  const label = `Planet id=${planet.id} act=${planet.activation}: lon=${planet.longitude.toFixed(2)}°`;
  assert(
    result.gate === planet.gate,
    `${label} → gate ${result.gate} (expected ${planet.gate})`,
  );
  // Also check line where we have enough precision
  assert(
    result.line === planet.line,
    `${label} → line ${result.line} (expected ${planet.line})`,
  );
}

// ─── 2. Type determination ────────────────────────────────────────────

console.log('\n=== Type Determination ===');

// Channel 34-20 (Sacral↔Throat) → Express Builder
{
  const channels = findCompletedChannels(20, [34]);
  const type = determineType(channels);
  assert(type === 'Express Builder', `34-20 channel → ${type} (expected Express Builder)`);
}

// Channel 7-31 (G↔Throat) → Advisor
{
  const channels = findCompletedChannels(31, [7]);
  const type = determineType(channels);
  assert(type === 'Advisor', `7-31 channel → ${type} (expected Advisor)`);
}

// Channel 21-45 (Ego↔Throat) → Initiator
{
  const channels = findCompletedChannels(45, [21]);
  const type = determineType(channels);
  assert(type === 'Initiator', `21-45 channel → ${type} (expected Initiator)`);
}

// No channels → Evaluator
{
  const channels = findCompletedChannels(17, []);
  const type = determineType(channels);
  assert(type === 'Evaluator', `No channels → ${type} (expected Evaluator)`);
}

// Channel 5-15 (Sacral↔G Center, no Throat) → Classic Builder
{
  const channels = findCompletedChannels(15, [5]);
  const type = determineType(channels);
  assert(type === 'Classic Builder', `5-15 channel → ${type} (expected Classic Builder)`);
}

// Motor→Throat chain through intermediate center:
// 54-32 (Root↔Spleen) + 57-20 (Spleen↔Throat)
// This should be Manifestor (Root motor → Spleen → Throat, no Sacral)
{
  // Moon provides gate 32, natal has 54, 57, 20
  const ch1 = findCompletedChannels(32, [54, 57, 20]);
  // The Moon only provides 32. That completes 32-54 (Root↔Spleen).
  // But 57-20 is natal only — no Moon involvement. So only 1 channel completes.
  // Result: Root + Spleen defined. No Throat. So Advisor.
  const type1 = determineType(ch1);
  assert(type1 === 'Advisor', `Moon=32, natal=[54,57,20] → ${type1} (expected Advisor, only 32-54 completes)`);
}

// ─── 3. Moon position sanity check ────────────────────────────────────

console.log('\n=== Moon Position Sanity Check ===');

// Test a known date: J2000.0 (Jan 1, 2000 12:00 TT)
const j2000 = new Date('2000-01-01T12:00:00Z');
const jde = julian.DateToJDE(j2000);
const pos = moonposition.position(jde);
const moonLon = (pos.lon * 180) / Math.PI;
const normalizedLon = ((moonLon % 360) + 360) % 360;

// The Moon's ecliptic longitude on 2000-01-01 was approximately 218° (in Scorpio)
// This is a sanity check, not a precision test
assert(
  normalizedLon > 200 && normalizedLon < 240,
  `Moon longitude on J2000.0: ${normalizedLon.toFixed(2)}° (expected ~218°)`,
);

// ─── Summary ──────────────────────────────────────────────────────────

console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
