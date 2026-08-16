'use client';

import { useState, useEffect, useCallback } from 'react';
import { getChartImageUrl } from '@/lib/chart-image';
import styles from './chart-image.module.css';

interface ChartImageProps {
  /** UTC birth time as ISO string, e.g. "1974-04-07T21:00:00Z" */
  birthTimeUtc: string;
  /** When true, suppress the built-in tap-to-lightbox behavior */
  disableLightbox?: boolean;
}

/**
 * Renders the Jovian Archive bodygraph image for a given UTC birth time.
 * Tap/click to open full-screen in a lightbox.
 */
export default function ChartImage({ birthTimeUtc, disableLightbox }: ChartImageProps) {
  const [open, setOpen] = useState(false);

  const url = getChartImageUrl(birthTimeUtc);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, close]);

  return (
    <>
      <div className={styles.container}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Bodygraph chart"
          className={styles.image}
          onClick={disableLightbox ? undefined : () => setOpen(true)}
        />
      </div>

      {open && !disableLightbox && (
        <div className={styles.overlay} onClick={close}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Bodygraph chart (full size)"
            className={styles.overlayImage}
          />
        </div>
      )}
    </>
  );
}
