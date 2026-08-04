import React from 'react';
import { Chart, PlanetActivation } from '@/lib/types/chart';
import hdChart from '@/lib/hd-chart';
import { channelStrengths } from '@/lib/hd-chart/constants';

interface ChartReadoutClasses {
  /** Wrapper around the list of rows */
  readout?: string;
  /** Each key/value row */
  rowitem?: string;
  /** Key (label) cell */
  k?: string;
  /** Value cell */
  v?: string;
}

interface ChartReadoutProps {
  chart: Chart;
  classes?: ChartReadoutClasses;
}

function capitalize(str: string | undefined): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Build ranked thematic lines from channel indices, weighted by planetary activations. */
function rankedThematicLines(channels: number[], planets: PlanetActivation[]): string[] {
  if (!channels?.length) return [];

  // Count planetary activations per gate
  const gateActivationCount: Record<number, number> = {};
  for (const p of planets) {
    gateActivationCount[p.gate] = (gateActivationCount[p.gate] ?? 0) + 1;
  }

  // Group channel gates by thematic, then sum activations
  const thematicGates: Record<string, Set<number>> = {};
  for (const i of channels) {
    const s = channelStrengths[i];
    if (!s) continue;
    if (!thematicGates[s.thematic]) thematicGates[s.thematic] = new Set();
    for (const g of s.gates) thematicGates[s.thematic].add(g);
  }

  const counts: Record<string, number> = {};
  for (const [thematic, gates] of Object.entries(thematicGates)) {
    counts[thematic] = [...gates].reduce(
      (sum, g) => sum + (gateActivationCount[g] ?? 0), 0
    );
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  // Group into ranks by count
  const ranks: string[][] = [];
  let prevCount = -1;
  for (const [name, count] of sorted) {
    if (count !== prevCount) {
      ranks.push([name]);
      prevCount = count;
    } else {
      ranks[ranks.length - 1].push(name);
    }
  }

  // Only one rank — no ordering needed
  if (ranks.length <= 1) {
    return ranks[0].length > 1
      ? [`${ranks[0].slice(0, -1).join(', ')} & ${ranks[0][ranks[0].length - 1]} (tied)`]
      : [ranks[0][0]];
  }

  const labels = ['Primary', 'Secondary', 'Tertiary'];
  return ranks.map((names, i) => {
    const label = labels[i] ?? '';
    const joined = names.length > 1
      ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]} (tied)`
      : names[0];
    return `${label}: ${joined}`;
  });
}

/**
 * Shared chart interpretation readout — renders the HD fields.
 * Style-agnostic: each consumer passes its own CSS classes.
 */
export default function ChartReadout({ chart, classes = {} }: ChartReadoutProps) {
  const hd = hdChart(chart);

  const rows: { label: string; value: string }[] = [
{ label: 'Decision-making Strategy', value: capitalize(hd.decisionMakingStrategy()) },
    { label: 'Public Role', value: hd.profile() ?? '' },
{ label: 'Assimilation Style', value: capitalize(hd.assimilationStyle()) },
    { label: 'Signposts', value: `${capitalize(hd.signatureTheme())} / ${capitalize(hd.notSelfTheme())}` },
  ];

  const thematicLines = rankedThematicLines(chart.channels, chart.planets ?? []);

  return (
    <div className={classes.readout}>
      {rows.map((row) => (
        <div key={row.label} className={classes.rowitem}>
          <div className={classes.k}>{row.label}</div>
          <div className={classes.v}>{row.value}</div>
        </div>
      ))}
      {thematicLines.length > 0 && (
        <div className={classes.rowitem}>
          <div className={classes.k}>Thematics</div>
          <div className={classes.v}>
            {thematicLines.map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
