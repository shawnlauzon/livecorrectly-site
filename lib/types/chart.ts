// Chart type definitions adapted from fractalhumandesign
// These match the structure of the chart JSONB column in subscribers table

export interface Chart {
  type: number;
  authority: number;
  definition: number;
  profile: number;
  centers: number[];
  channels: number[];
  gates: unknown; // JSONB - structure varies
  cycles: unknown; // JSONB - structure varies
  data: unknown; // JSONB - full calculation data
}
