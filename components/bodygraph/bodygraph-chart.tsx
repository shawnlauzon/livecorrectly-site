import type { Chart, PlanetActivation } from '@/lib/types/chart';
import { Bodygraph } from './bodygraph';
import { PlanetSidebar } from './planet-sidebar';
import styles from './bodygraph.module.css';

interface BodygraphChartProps {
  chart: Chart;
  planets: PlanetActivation[];
  showGateNumbers?: boolean;
  showSidebars?: boolean;
  notation?: 'classic' | 'bg5';
}

/**
 * Composite bodygraph component: Design sidebar + SVG + Personality sidebar.
 *
 * Each sub-component is independently usable:
 * - `<Bodygraph>` for just the SVG
 * - `<PlanetSidebar>` for just a planet column
 * - `<BodygraphChart>` for the full composite
 */
export function BodygraphChart({
  chart,
  planets,
  showGateNumbers = true,
  showSidebars = true,
  notation,
}: BodygraphChartProps) {
  return (
    <div className={styles.bodygraphChart}>
      {showSidebars && <PlanetSidebar planets={planets} side="design" notation={notation} />}
      <Bodygraph
        chart={chart}
        showGateNumbers={showGateNumbers}
        className={styles.bodygraphSvgWrapper}
      />
      {showSidebars && <PlanetSidebar planets={planets} side="personality" notation={notation} />}
    </div>
  );
}
