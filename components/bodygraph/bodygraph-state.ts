// State pipeline for the bodygraph renderer.
// Ported from mm-v2.js (functions Ho, Ro, Go, No, So).
// Takes Chart data and computes gate/channel/center activation state
// for CSS class application on the SVG.

import type { Chart, PlanetActivation } from '@/lib/types/chart';
import { channelStrengths, gateToCenter } from '@/lib/hd-chart/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Activation = 'design' | 'personality' | 'mixed';

export interface GateState {
  activation: Activation | null;
  defined: boolean;
  inChannel: boolean;
}

export interface ChannelState {
  gateIds: [number, number];
  activation: Activation;
}

export interface CenterState {
  defined: boolean;
}

/** Full computed state for the bodygraph SVG. */
export interface BodygraphState {
  gates: Map<number, GateState>;
  channels: Map<string, ChannelState>;
  centers: Map<string, CenterState>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All 64 gate numbers. */
const ALL_GATES = Array.from({ length: 64 }, (_, i) => i + 1);

/** Center SVG IDs in the order matching our centerNames array index.
 *  Index: 0=Root, 1=Sacral, 2=Spleen, 3=Solar Plexus, 4=Ego, 5=G, 6=Throat, 7=Ajna, 8=Head */
export const CENTER_SVG_IDS = [
  'root',
  'sacral',
  'spleen',
  'solar_plexus',
  'heart',
  'g',
  'throat',
  'ajna',
  'head',
] as const;

/** All center SVG IDs as a set for iteration. */
const ALL_CENTER_IDS = new Set<string>(CENTER_SVG_IDS);

/** Integration channel gates (special rendering in the widget). */
export const INTEGRATION_GATES = [10, 20, 34, 57] as const;

/** CSS class mapping for activation types. */
export const ACTIVATION_CSS: Record<Activation, string> = {
  design: 'c1',
  personality: 'c2',
  mixed: 'mixed',
};

// ---------------------------------------------------------------------------
// Channel definitions — derived from channelStrengths
// ---------------------------------------------------------------------------

interface ChannelDef {
  gates: [number, number];
  lower: number;
  upper: number;
  key: string; // "lower-upper" e.g. "1-8"
}

const CHANNEL_DEFS: ChannelDef[] = channelStrengths.map((ch) => {
  const lower = Math.min(ch.gates[0], ch.gates[1]);
  const upper = Math.max(ch.gates[0], ch.gates[1]);
  return {
    gates: [ch.gates[0], ch.gates[1]],
    lower,
    upper,
    key: `${lower}-${upper}`,
  };
});

// ---------------------------------------------------------------------------
// Gate → center SVG ID lookup
// ---------------------------------------------------------------------------

function gateToCenterSvgId(gate: number): string | undefined {
  const centerIndex = gateToCenter[gate];
  if (centerIndex === undefined) return undefined;
  return CENTER_SVG_IDS[centerIndex];
}

// ---------------------------------------------------------------------------
// Pipeline — mirrors mm-v2.js Lo()/Ho()/Ro()/Go()/No()/So()
// ---------------------------------------------------------------------------

const DESIGN_BIT = 1;
const PERSONALITY_BIT = 2;
const MIXED_BITS = 3;

/**
 * Step 1: Build gate activations from planet data.
 * Each planet activation marks its gate as design (activation=0) or personality (activation=1).
 * If a gate is activated by both, it becomes "mixed".
 *
 * Port of Ho() from mm-v2.js line 15221.
 */
function buildGateActivations(
  planets: PlanetActivation[]
): Map<number, Activation> {
  const bits = new Map<number, number>();

  for (const planet of planets) {
    if (planet.gate == null) continue;
    const gate = Number(planet.gate);
    const current = bits.get(gate) || 0;
    if (planet.activation === 0) {
      bits.set(gate, current | DESIGN_BIT);
    } else if (planet.activation === 1) {
      bits.set(gate, current | PERSONALITY_BIT);
    }
  }

  const activations = new Map<number, Activation>();
  for (const [gate, b] of bits) {
    if (b === MIXED_BITS) activations.set(gate, 'mixed');
    else if (b === PERSONALITY_BIT) activations.set(gate, 'personality');
    else if (b === DESIGN_BIT) activations.set(gate, 'design');
  }

  return activations;
}

/**
 * Step 2: Build active channels from gate activations.
 * A channel is active when both of its gates are activated.
 * The channel's activation type is the same as its gates if they match,
 * otherwise "mixed".
 *
 * Port of Ro() from mm-v2.js line 15252.
 */
function buildActiveChannels(
  gateActivations: Map<number, Activation>
): Map<string, ChannelState> {
  const channels = new Map<string, ChannelState>();

  for (const ch of CHANNEL_DEFS) {
    const a = gateActivations.get(ch.gates[0]);
    const b = gateActivations.get(ch.gates[1]);
    if (a && b) {
      channels.set(ch.key, {
        gateIds: [ch.lower, ch.upper],
        activation: a === b ? a : 'mixed',
      });
    }
  }

  return channels;
}

/**
 * Step 3: Build defined centers from active channels.
 * A center is defined when at least one of its channels is complete.
 *
 * Port of Go() from mm-v2.js line 15268.
 */
function buildDefinedCenters(
  channels: Map<string, ChannelState>
): Set<string> {
  const defined = new Set<string>();

  for (const [, ch] of channels) {
    for (const gateId of ch.gateIds) {
      const centerId = gateToCenterSvgId(gateId);
      if (centerId) defined.add(centerId);
    }
  }

  return defined;
}

/**
 * Step 4: Build full gate state (activation + defined + inChannel).
 *
 * Port of No() from mm-v2.js line 15295.
 */
function buildGateState(
  gateActivations: Map<number, Activation>,
  channels: Map<string, ChannelState>
): Map<number, GateState> {
  // Collect all gate IDs that are part of active channels
  const inChannelGates = new Set<number>();
  for (const [, ch] of channels) {
    for (const gateId of ch.gateIds) {
      inChannelGates.add(gateId);
    }
  }

  const gates = new Map<number, GateState>();
  for (const gateNum of ALL_GATES) {
    const activation = gateActivations.get(gateNum) || null;
    gates.set(gateNum, {
      activation,
      defined: activation !== null,
      inChannel: inChannelGates.has(gateNum),
    });
  }

  return gates;
}

/**
 * Step 5: Build center state.
 *
 * Port of So() from mm-v2.js line 15314.
 */
function buildCenterState(
  definedCenters: Set<string>
): Map<string, CenterState> {
  const centers = new Map<string, CenterState>();
  for (const centerId of ALL_CENTER_IDS) {
    centers.set(centerId, { defined: definedCenters.has(centerId) });
  }
  return centers;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the full bodygraph state from chart planet data.
 * This is the main entry point — port of Lo() from mm-v2.js line 15183.
 */
export function computeBodygraphState(chart: Chart): BodygraphState {
  const gateActivations = buildGateActivations(chart.planets);
  const channels = buildActiveChannels(gateActivations);
  const definedCenters = buildDefinedCenters(channels);

  return {
    gates: buildGateState(gateActivations, channels),
    channels,
    centers: buildCenterState(definedCenters),
  };
}

/**
 * Get the SVG channel element ID for a channel key.
 * Channel key format: "lower-upper" (e.g. "1-8").
 * SVG element ID: "c" + lower + upper with no separator (e.g. "c18").
 */
export function channelSvgId(channelKey: string): string {
  return `c${channelKey.replace('-', '')}`;
}

/**
 * Get the SVG highlight channel element ID.
 */
export function channelHighlightSvgId(channelKey: string): string {
  return `hlc${channelKey.replace('-', '')}`;
}
