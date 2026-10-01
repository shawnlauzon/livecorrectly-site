'use client';

import { useEffect } from 'react';
import type { Chart } from '@/lib/types/chart';
import { BodygraphChart } from '@/components/bodygraph/bodygraph-chart';
import styles from './chart-lightbox.module.css';

interface ChartLightboxProps {
  chart: Chart;
  onClose: () => void;
}

/**
 * Full-screen bodygraph overlay. Click the backdrop or press Escape to close.
 */
export function ChartLightbox({ chart, onClose }: ChartLightboxProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <BodygraphChart chart={chart} planets={chart.planets} />
      </div>
    </div>
  );
}
