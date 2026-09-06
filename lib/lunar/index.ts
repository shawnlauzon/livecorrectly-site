/**
 * Lunar cycle calculations for Reflectors.
 *
 * Public API — re-exports the pieces consumers need.
 */

export { calculateLunarCycle, type MoonTransit } from './moon-transit';
export { findCompletedChannels, type CompletedChannel } from './channel-completion';
export { determineType, getDefinedCenters } from './type-determination';
export { gateAtLongitude, gateLongitudeRange, GATE_SEQUENCE } from './gate-wheel';
