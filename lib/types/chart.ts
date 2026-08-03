// Chart type definitions matching the actual JSONB structure in subscribers.chart
// Derived from the fractalhumandesign engine output

/** A gate activation with its mode */
export interface ChartGate {
  gate: number;
  /** 0 = personality only, 1 = design only, 2 = both */
  mode: number;
}

/** A fixing trigger on a planet activation */
export interface FixingTrigger {
  gate: number;
  line: number;
  state: number;
  planet: number;
  chartId: number;
  activation: number;
}

/** Fixing state for a planet */
export interface Fixing {
  state: number;
  triggers: FixingTrigger[];
  conditioned: boolean;
}

/** A planet activation (personality or design) */
export interface PlanetActivation {
  id: number;
  base: number;
  gate: number;
  line: number;
  tone: number;
  color: number;
  fixing: Fixing;
  chartId: number;
  longitude: number;
  /** 0 = design, 1 = personality */
  activation: number;
  basePercent: number;
  gatePercent: number;
  linePercent: number;
  tonePercent: number;
  colorPercent: number;
  baseAlignment?: number;
}

/** Life cycle transit dates */
export interface Cycles {
  chiron: string;
  saturn: string;
  uranus: string;
  secondSaturn: string;
}

/** Group/environment data — API changed field names (lg→lb, th→theme) */
export interface ChartGroup {
  lb?: boolean | number[];
  lg?: boolean | number[];
  theme?: number[];
  th?: number[];
  env: string[];
}

/** Bridges data for bringing traits/strengths shadow */
export interface Bridges {
  bridgingGates?: number[];
  bridgingChannels?: string[];
  bridgingFarGates?: number[];
}

/** The inner chart data — type, authority, centers, channels, planets, etc. */
export interface Chart {
  type: number;
  view: number;
  cross: number;
  gates: ChartGate[];
  group: ChartGroup;
  sense: number;
  cycles: Cycles;
  /** 9-element array, one per center */
  centers: number[];
  planets: PlanetActivation[];
  profile: number;
  channels: number[];
  variable: number;
  authority: number;
  cognition: number;
  definition: number;
  motivation: number;
  environment: number;
  transference: number;
  determination: number;
  designBaseOrientation: number;
  personalityBaseOrientation: number;
  /** Bridges field for bringing traits/strengths shadow - can be null */
  bridges?: Bridges | null;
}

/** Timezone info from the engine */
export interface BirthTimezone {
  id: string;
  name: string;
  offset: number;
}

/** Birth time data */
export interface BirthTime {
  dst: number | null;
  utc: string;
  local: string;
  status: string;
  timezone: BirthTimezone;
}

/** Birth location city */
export interface BirthCity {
  tz: string;
  name: string;
  timezone: string;
}

/** Birth location country */
export interface BirthCountry {
  id: string;
  tz: string | null;
  name: string;
}

/** Birth location */
export interface BirthLocation {
  city: BirthCity;
  country: BirthCountry;
}

/** Reliability data for the chart calculation */
export interface Reliability {
  score: number;
  changes: {
    type: number;
    cross: number;
    centers: number;
    profile: number;
    channels: number;
    variable: number;
    authority: number;
    definition: number;
  };
  context: string;
}

/** Birth data stored in meta */
export interface BirthData {
  time: BirthTime;
  location: BirthLocation;
  reliability: Reliability;
}

/** Chart metadata */
export interface ChartMeta {
  name: string;
  tags: string[];
  type: string;
  dirty: boolean;
  created: string;
  updated: string;
  birthData: BirthData;
}

/** The full JSONB blob stored in subscribers.chart */
export interface ChartRecord {
  meta: ChartMeta;
  chart: Chart;
}
