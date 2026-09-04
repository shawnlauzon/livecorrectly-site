import type { PlanetActivation } from '@/lib/types/chart';
import styles from './bodygraph.module.css';

interface PlanetSidebarProps {
  planets: PlanetActivation[];
  side: 'design' | 'personality';
}

// ---------------------------------------------------------------------------
// Planet metadata
// ---------------------------------------------------------------------------

/** Display order matches the Maia API planet IDs (0–12). */
const PLANET_META: { id: number; name: string; symbol: string }[] = [
  { id: 0, name: 'Sun', symbol: '☉' },
  { id: 1, name: 'Earth', symbol: '⊕' },
  { id: 2, name: 'North Node', symbol: '☊' },
  { id: 3, name: 'South Node', symbol: '☋' },
  { id: 4, name: 'Moon', symbol: '☽' },
  { id: 5, name: 'Mercury', symbol: '☿' },
  { id: 6, name: 'Venus', symbol: '♀' },
  { id: 7, name: 'Mars', symbol: '♂' },
  { id: 8, name: 'Jupiter', symbol: '♃' },
  { id: 9, name: 'Saturn', symbol: '♄' },
  { id: 10, name: 'Uranus', symbol: '♅' },
  { id: 11, name: 'Neptune', symbol: '♆' },
  { id: 12, name: 'Pluto', symbol: '♇' },
];

/** Fixing state indicators. */
const FIXING_INDICATORS: Record<number, string> = {
  1: '▲',
  2: '▼',
};

/**
 * Renders a column of planet activations (Design or Personality side).
 *
 * Design planets have activation === 0, Personality planets have activation === 1.
 * Each row shows: planet symbol, gate.line, and optional fixing indicator.
 */
export function PlanetSidebar({ planets, side }: PlanetSidebarProps) {
  const activationFilter = side === 'design' ? 0 : 1;

  // Filter to the correct side and sort by planet ID
  const sidePlanets = planets
    .filter((p) => p.activation === activationFilter)
    .sort((a, b) => a.id - b.id);

  return (
    <div
      className={`${styles.planetSidebar} ${side === 'design' ? styles.designSide : styles.personalitySide}`}
    >
      <div className={styles.sidebarHeader}>
        {side === 'design' ? 'Design' : 'Personality'}
      </div>
      <div className={styles.planetList}>
        {PLANET_META.map((meta) => {
          const planet = sidePlanets.find((p) => p.id === meta.id);
          if (!planet) return null;

          return (
            <div key={meta.id} className={styles.planetRow}>
              <span
                className={styles.planetSymbol}
                title={meta.name}
                aria-label={meta.name}
              >
                {meta.symbol}
              </span>
              <span className={styles.planetGateLine}>
                {planet.gate}
                <span className={styles.planetLineSep}>.</span>
                {planet.line}
              </span>
              {planet.fixing.state !== 0 && (
                <span
                  className={styles.fixingIndicator}
                  title={
                    planet.fixing.state === 1
                      ? 'Left fixing'
                      : planet.fixing.state === 2
                        ? 'Right fixing'
                        : 'Juxtaposed fixing'
                  }
                >
                  {FIXING_INDICATORS[planet.fixing.state] || '◆'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
