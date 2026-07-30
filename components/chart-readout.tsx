import { Chart } from '@/lib/types/chart';
import hdChart from '@/lib/hd-chart';

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

/**
 * Shared chart interpretation readout — renders the 10 HD fields.
 * Style-agnostic: each consumer passes its own CSS classes.
 */
export default function ChartReadout({ chart, classes = {} }: ChartReadoutProps) {
  const hd = hdChart(chart);

  const rows: { label: string; value: string }[] = [
    { label: 'Type', value: hd.type() ?? '' },
    { label: 'Career Design', value: hd.careerDesign() ?? '' },
    { label: 'Strategy', value: capitalize(hd.strategy()) },
    { label: 'Inner Authority', value: hd.innerAuthority() ?? '' },
    { label: 'Decision-making Strategy', value: capitalize(hd.decisionMakingStrategy()) },
    { label: 'Profile', value: hd.profile() ?? '' },
    { label: 'Definition', value: capitalize(hd.definition()) },
    { label: 'Assimilation Style', value: capitalize(hd.assimilationStyle()) },
    { label: 'Signature Theme (on-track)', value: capitalize(hd.signatureTheme()) },
    { label: 'Not-Self Theme (off-track)', value: capitalize(hd.notSelfTheme()) },
  ];

  return (
    <div className={classes.readout}>
      {rows.map((row) => (
        <div key={row.label} className={classes.rowitem}>
          <div className={classes.k}>{row.label}</div>
          <div className={classes.v}>{row.value}</div>
        </div>
      ))}
    </div>
  );
}
