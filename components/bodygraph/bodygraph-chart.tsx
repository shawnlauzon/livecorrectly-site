import type { Chart, PlanetActivation } from '@/lib/types/chart';
import { Bodygraph } from './bodygraph';
import { PlanetSidebar } from './planet-sidebar';
import styles from './bodygraph.module.css';

interface BodygraphChartProps {
  chart: Chart;
  planets: PlanetActivation[];
  showGateNumbers?: boolean;
  showSidebars?: boolean;
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
}: BodygraphChartProps) {
  return (
    <div className={styles.bodygraphChart}>
      {showSidebars && <PlanetSidebar planets={planets} side="design" />}
      <Bodygraph
        chart={chart}
        showGateNumbers={showGateNumbers}
        className={styles.bodygraphSvgWrapper}
      />
      {showSidebars && <PlanetSidebar planets={planets} side="personality" />}
    </div>
  );
}
