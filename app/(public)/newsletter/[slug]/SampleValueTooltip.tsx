'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { createHoverIntent } from './hover-intent';
import styles from './page.module.css';

const SHOW_DELAY_MS = 1000;
const HIDE_DELAY_MS = 150;

interface SampleValueTooltipProps {
  /** Rendered issue HTML containing `<mark class="sample-value">` elements */
  html: string;
  /** Career design of the sample chart the issue was rendered against */
  sampleCareerDesign: string;
}

interface TooltipPosition {
  /** Horizontal center, relative to the wrapper */
  left: number;
  /** Top of the tooltip (just below the hovered line), relative to the wrapper */
  top: number;
}

/**
 * Issue body for the sample-chart view. Resting the pointer on a highlighted
 * sample value for a second shows a short "get your own chart" tooltip.
 */
export default function SampleValueTooltip({ html, sampleCareerDesign }: SampleValueTooltipProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const intent = useMemo(
    () =>
      createHoverIntent<TooltipPosition>({
        showDelay: SHOW_DELAY_MS,
        hideDelay: HIDE_DELAY_MS,
        onShow: setPosition,
        onHide: () => setPosition(null),
      }),
    [],
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const markFrom = (target: EventTarget | null) =>
      target instanceof Element ? target.closest('mark.sample-value') : null;

    const handleOver = (e: MouseEvent) => {
      const mark = markFrom(e.target);
      if (!mark) return;
      // A wrapped mark has one rect per line; anchor to the line under the pointer
      const rects = [...mark.getClientRects()];
      const rect =
        rects.find((r) => e.clientY >= r.top && e.clientY <= r.bottom) ??
        mark.getBoundingClientRect();
      const base = wrapper.getBoundingClientRect();
      intent.enter({
        left: rect.left + rect.width / 2 - base.left,
        top: rect.bottom - base.top + 6,
      });
    };

    const handleOut = (e: MouseEvent) => {
      const mark = markFrom(e.target);
      if (!mark || mark.contains(e.relatedTarget as Node | null)) return;
      intent.leave();
    };

    wrapper.addEventListener('mouseover', handleOver);
    wrapper.addEventListener('mouseout', handleOut);
    return () => {
      wrapper.removeEventListener('mouseover', handleOver);
      wrapper.removeEventListener('mouseout', handleOut);
      intent.cancel();
    };
  }, [intent]);

  return (
    <div ref={wrapperRef} className={styles.sampleBody}>
      <div className={styles.body} dangerouslySetInnerHTML={{ __html: html }} />
      {position && (
        <div
          role="tooltip"
          className={styles.sampleTooltip}
          style={{ '--anchor-x': `${position.left}px`, top: position.top } as React.CSSProperties}
          onMouseEnter={() => intent.hold()}
          onMouseLeave={() => intent.leave()}
        >
          Written for a sample {sampleCareerDesign}.{' '}
          <Link
            href="/see-your-design"
            onClick={() => track('cta_click', { location: 'newsletter_sample_tooltip' })}
          >
            Get your free chart
          </Link>{' '}
          to see yours.
        </div>
      )}
    </div>
  );
}
