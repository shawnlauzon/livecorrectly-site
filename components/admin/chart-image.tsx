'use client';

import styles from './chart-image.module.css';

interface ChartImageProps {
  /** UTC birth time as ISO string, e.g. "1974-04-07T21:00:00Z" */
  birthTimeUtc: string;
}

/**
 * Renders the Jovian Archive bodygraph image for a given UTC birth time.
 * URL formula from fractalhumandesign ChartImage component.
 */
export default function ChartImage({ birthTimeUtc }: ChartImageProps) {
  const time = new Date(birthTimeUtc).getTime();
  const timeId = 1e4 * time + 621355968e9;
  const url = `https://cdn.jovianarchive.com/RaveChartGenerator.php?Time=${timeId}`;

  return (
    <div className={styles.container}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Bodygraph chart"
        className={styles.image}
      />
    </div>
  );
}
