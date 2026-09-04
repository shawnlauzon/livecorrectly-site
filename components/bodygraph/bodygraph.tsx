'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import type { Chart } from '@/lib/types/chart';
import { BODYGRAPH_SVG } from './bodygraph-svg';
import { BODYGRAPH_CSS } from './bodygraph-css';
import {
  computeBodygraphState,
  ACTIVATION_CSS,
  channelSvgId,
  channelHighlightSvgId,
  INTEGRATION_GATES,
  type BodygraphState,
} from './bodygraph-state';

/** Pre-built HTML — never changes, safe to share across all instances. */
const SVG_HTML = `<style>${BODYGRAPH_CSS}</style>${BODYGRAPH_SVG.replace('<svg', '<svg class="theme-light bg-standard"')}`;

interface BodygraphProps {
  chart: Chart;
  showGateNumbers?: boolean;
  className?: string;
}

/**
 * Renders the Human Design bodygraph as an inline SVG.
 *
 * Mirrors the rendering approach from the Maia Mechanics widget:
 * inject the SVG template into the DOM, then apply CSS classes to
 * gate/channel/center elements based on computed state.
 */
export function Bodygraph({
  chart,
  showGateNumbers = true,
  className,
}: BodygraphProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const state = useMemo(() => computeBodygraphState(chart), [chart]);

  // Apply activation classes to the SVG DOM on every render.
  // The SVG is injected via dangerouslySetInnerHTML (static template);
  // gate/channel/center visibility is driven by adding CSS classes to
  // those elements. Re-applying on every render is cheap (a handful of
  // classList ops) and guarantees classes survive if React ever replaces
  // the innerHTML (e.g. when an ancestor re-renders and the __html
  // object reference changes).
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const svg = wrapper.querySelector('svg');
    if (!svg) return;

    // Ensure gates layer is before centers layer (z-order)
    const gatesLayer = svg.querySelector(':scope > #gates');
    const centersLayer = svg.querySelector(':scope > #centers');
    if (
      gatesLayer &&
      centersLayer &&
      gatesLayer.compareDocumentPosition(centersLayer) &
        Node.DOCUMENT_POSITION_PRECEDING
    ) {
      centersLayer.parentNode!.insertBefore(gatesLayer, centersLayer);
    }

    renderGates(svg, state, showGateNumbers);
    renderChannels(svg, state);
    renderCenters(svg, state);
  });

  // Stable reference — never changes, prevents React from replacing innerHTML.
  const html = useMemo(() => ({ __html: SVG_HTML }), []);

  return (
    <div
      ref={wrapperRef}
      className={className}
      dangerouslySetInnerHTML={html}
    />
  );
}

// ---------------------------------------------------------------------------
// DOM rendering — mirrors mm-v2.js _renderGates/_renderChannels/_renderCenters
// ---------------------------------------------------------------------------

function renderGates(
  svg: SVGElement,
  state: BodygraphState,
  showGateNumbers: boolean
) {
  for (const [gateNum, gateState] of state.gates) {
    const gateEl = svg.querySelector(`#g${gateNum}`);
    if (gateEl) {
      gateEl.classList.remove('defined', 'c1', 'c2', 'mixed', 'inChannel');

      // Reset inline styles on sub-elements
      const sEl = gateEl.querySelector('.s') as SVGElement | null;
      if (sEl) {
        sEl.style.fill = '';
        sEl.style.color = '';
      }

      if (gateState.defined && gateState.activation) {
        gateEl.classList.add('defined');
        const cssClass = ACTIVATION_CSS[gateState.activation];
        if (cssClass) gateEl.classList.add(cssClass);
        if (gateState.inChannel) gateEl.classList.add('inChannel');
      }
    }

    // Gate number labels
    const gnEl = svg.querySelector(`#gn${gateNum}`);
    if (gnEl) {
      if (gateState.defined) {
        gnEl.classList.add('defined');
      } else {
        gnEl.classList.remove('defined');
      }
      (gnEl as SVGElement).style.display = showGateNumbers ? '' : 'none';
    }
  }
}

function renderChannels(svg: SVGElement, state: BodygraphState) {
  for (const [channelKey, channelState] of state.channels) {
    const chId = channelSvgId(channelKey);
    const chEl = svg.querySelector(`#${chId}`);

    if (chEl) {
      chEl.classList.add('defined');

      // Only add color class for integration channels (matches widget behavior)
      if (
        channelState.gateIds.every((g) =>
          (INTEGRATION_GATES as readonly number[]).includes(g)
        )
      ) {
        const cssClass = ACTIVATION_CSS[channelState.activation];
        if (cssClass) chEl.classList.add(cssClass);
      }
    }

    const hlId = channelHighlightSvgId(channelKey);
    const hlEl = svg.querySelector(`#${hlId}`);
    if (hlEl) {
      hlEl.classList.add('defined');
    }
  }
}

function renderCenters(svg: SVGElement, state: BodygraphState) {
  for (const [centerId, centerState] of state.centers) {
    const centerEl = svg.querySelector(`#${centerId}`);
    if (centerEl) {
      if (centerState.defined) {
        centerEl.classList.add('defined');
      } else {
        centerEl.classList.remove('defined');
      }
    }
  }
}
