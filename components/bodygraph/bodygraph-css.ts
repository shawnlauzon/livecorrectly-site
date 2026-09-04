// Auto-extracted from scripts/mm-v2.js (standard style bodygraph CSS)
// Do not edit manually — re-extract from the widget source if changes are needed.

export const BODYGRAPH_CSS = `/* @format */

/* ============================================================
 * Bodygraph Renderer \u2014 Stylesheet
 *
 * Converted from Bodygraph/styles.styl + charts.styl variables.
 * Targets the restructured SVG with new ID conventions:
 *   Gates: gt-{num}, Channels: ch-{a}-{b}, Centers: ctr-{name}
 *   Layers: layer-background, layer-channels, layer-centers,
 *           layer-gates, layer-highlights
 *
 * Variable substitutions (from charts.styl):
 *   $activations-design       \u2192 #D04948
 *   $activations-personality   \u2192 #2F2F2F
 *   $activations-personality-dark \u2192 #f8f8f8
 *   $activations-chart1       \u2192 #6a8bb5
 *   $activations-chart2       \u2192 #83cbb4
 *   $activations-chart1a      \u2192 #8DCBC5
 *   $activations-chart2a      \u2192 #b59bcb
 *   $centers                  \u2192 #fff
 *   $centers--dark            \u2192 #1b1a1a
 *   $primary-color            \u2192 #678a9a
 * ============================================================ */


/* === Base === */

.bodygraph-wrapper > svg {
  /* iOS/WebKit gives a viewBox-only inline SVG no intrinsic size inside a
   * flex container, collapsing it to 0 (invisible chart). A definite
   * width/height (the old inline-SVG component used width/height=100%)
   * restores it; max-* keep it letterboxed within the wrapper. */
  width: 100%;
  height: 100%;
  max-height: 100%;
  max-width: 100%;
  position: relative;
}

#figure {
  stroke-width: 0;
}

#channels,
#gates,
#centers {
  stroke-width: 0;
}


/* === Activation colour tokens ===
 * Single source of truth for the design / personality activation colours,
 * referenced by gate strips, the mixed \`.m\` overlay, triple-colour gates and
 * the integration ropes (#847). Defined per theme on the SVG root, which always
 * carries a \`theme-*\` class (applied on mount \u2014 see modules/withTheme.js), so
 * the tokens cascade to every #gates / #channels descendant.
 *   --act-design       red, both themes        ($activations-design)
 *   --act-personality  #2F2F2F light / #f8f8f8 dark ($activations-personality[-dark]) */
.theme-light {
  --act-design: #D04948;
  --act-personality: #2F2F2F;
}
.theme-dark {
  --act-design: #D04948;
  --act-personality: #f8f8f8;
}


/* === Gates \u2014 defaults === */

#gates .s {
  display: none;
  fill: var(--act-design);
}

#gates .m {
  display: none;
  fill: none;
  opacity: 0;
}

#gates .h {
  fill: transparent;
  display: none;
}


/* === Gates \u2014 defined states === */

/* Adjacent gate halves on a channel are independent filled shapes that meet
 * at the channel midpoint. A thin stroke matching the fill (via currentColor)
 * extends each half outward, overlapping its neighbor and masking the seam.
 * paint-order: stroke fill keeps the stroke under the fill so the inner
 * silhouette is unchanged \u2014 only the outer/seam edge grows by ~0.75px. */
#gates .defined .s {
  display: block;
  stroke: currentColor;
  stroke-width: 1.5;
  paint-order: stroke fill;
}

/* \`color\` mirrors \`fill\` on every activation rule so the seam-masking stroke
 * (stroke: currentColor, paint-order: stroke fill \u2014 see \`#gates .defined .s\`)
 * extends the activation fill outward instead of bleeding a mismatched colour
 * at the gate union. The personality token is theme-aware, so dark mode picks up
 * #f8f8f8 here without a separate override. */
#gates .defined.c1 .s {
  fill: var(--act-design);
  color: var(--act-design);
}

#gates .defined.c2 .s,
#gates .defined.mixed .s {
  fill: var(--act-personality);
  color: var(--act-personality);
}

#gates .defined.inChannel .s {
  filter: none !important;
}

#gates .defined.mixed .m {
  fill: var(--act-design);
  display: block;
  opacity: 1;
}

/* The mixed design-red overlay (.m) covers one half of the gate but, unlike
 * \`#gates .defined .s\` above, had no seam-masking stroke \u2014 so the two red
 * halves of a mixed channel meet at the gate union with a thin gap, visible
 * against the dark channel background. Extend it with a stroke matching its
 * #D04948 fill, mirroring the .defined .s treatment. Scoped to non-composite
 * charts: connection-chart (.composite/.tripleColor) gates recolor .m with
 * other solid colors and gradients, handled by their own rules. */
.theme-light:not(.composite) #gates .defined.mixed .m,
.theme-dark:not(.composite) #gates .defined.mixed .m {
  stroke: var(--act-design);
  stroke-width: 1.5;
  paint-order: stroke fill;
}


/* === Gates \u2014 highlight === */

#gates .defined.highlight .h {
  stroke: #678a9a !important;
  stroke-width: 12 !important;
  display: initial;
  paint-order: stroke;
}


/* === Channels \u2014 defaults === */

#channels {
  fill: #1d1d1d;
}

#channels .muted {
  fill-opacity: 0.45;
}

#channels .strong {
  fill-opacity: 1;
}

/* Integration channels (transparent by default \u2014 renderer toggles visibility).
 * Only these four are transparent: the cint-* compounds / integration figure
 * overlay them. c2057 (20-57) and c1034 (10-34) are intentionally NOT listed \u2014
 * they inherit the #channels fill so they render as the normal empty-channel
 * rope (white in light, dark in dark) behind gates 20/57 and 10/34. */
[id^="cint-"],
#c1020,
#c2034,
#c3457,
#c1057 {
  fill: transparent;
}

/* Defined integration ropes \u2014 bridge fill (#847).
 *
 * The two-gate integration ropes (#c1020 #c2034 #c3457 #c1057 #c2057 #c1034)
 * span the full channel and sit under the two gate strips; their fill bridges
 * the small junction where the strips meet. Left transparent it shows as a break
 * in the rope (a defined gate looking unconnected). The renderer
 * (BodygraphRenderer._renderChannels) tags ONLY these integration ropes with the
 * activation class (.c1/.c2/.mixed) on a #channels path \u2014 regular channels never
 * receive those classes \u2014 so the class-based selectors below target exactly the
 * six ropes and colour them with the same activation tokens as the gate strips
 * they mirror.
 *
 * The \`:not(.composite)\` is anchored to the theme class because \`composite\` and
 * \`theme-*\` are toggled on the SAME element (the SVG root \u2014 see
 * BodygraphRenderer). A bare \`:not(.composite) #channels \u2026\` would instead match
 * any non-composite ancestor (the wrapper/body) and paint the rope even on
 * composite charts. Connection charts recolour gate strips with their own
 * blue/teal palette, so these neutral activation colours would clash there;
 * composite keeps the rope transparent and lets the composite-coloured strips
 * draw it. !important beats the theme \`#channels\` fill, matching the convention
 * used in the theme channel rules below. */
.theme-light:not(.composite) #channels .defined.c1,
.theme-dark:not(.composite) #channels .defined.c1 {
  fill: var(--act-design) !important;
}
.theme-light:not(.composite) #channels .defined.c2,
.theme-light:not(.composite) #channels .defined.mixed,
.theme-dark:not(.composite) #channels .defined.c2,
.theme-dark:not(.composite) #channels .defined.mixed {
  fill: var(--act-personality) !important;
  fill-opacity: 1 !important;
}

/* Channels \u2014 defined stroke */
#channels path.defined,
#channels rect.defined {
  stroke: #ffffff54;
  stroke-width: 0;
}

/* Channels \u2014 highlight */
#channels path.highlight,
#channels rect.highlight {
  stroke: #678a9a !important;
  stroke-width: 12 !important;
}


/* === Centers \u2014 defaults === */

#centers .shape {
  stroke-width: 1px;
}

#centers .defined .shape {
  opacity: 1;
}

#centers circle {
  display: none;
  pointer-events: none;
}


/* === Centers \u2014 gate numbers === */

#centers .nums text {
  font-family: 'Arial';
  font-size: 30px;
  text-anchor: middle;
  pointer-events: none;
}

#centers .defined .nums text {
  font-weight: normal;
  opacity: 0.5;
}

#centers .nums g.defined circle {
  display: block !important;
  fill: #668a9a !important;
  opacity: 0.85;
}

#centers .nums g.defined text {
  font-weight: bold;
  opacity: 1;
  fill: #fff !important;
}


/* === Centers \u2014 defined fills (per-center gradients) === */
/* NOTE: These use .theme-light/.theme-dark prefix to override
   the theme-specific .shape fill rules that have equal specificity. */

.theme-light #root.defined .shape,
.theme-dark #root.defined .shape         { fill: url(#centerDefinedBrown); }
.theme-light #sacral.defined .shape,
.theme-dark #sacral.defined .shape       { fill: url(#centerDefinedRed); }
.theme-light #spleen.defined .shape,
.theme-dark #spleen.defined .shape       { fill: url(#centerDefinedBrown); }
.theme-light #solar_plexus.defined .shape,
.theme-dark #solar_plexus.defined .shape { fill: url(#centerDefinedBrown); }
.theme-light #heart.defined .shape,
.theme-dark #heart.defined .shape        { fill: url(#centerDefinedRed); }
.theme-light #throat.defined .shape,
.theme-dark #throat.defined .shape       { fill: url(#centerDefinedBrown); }
.theme-light #g.defined .shape,
.theme-dark #g.defined .shape            { fill: url(#centerDefinedYellow); }
.theme-light #ajna.defined .shape,
.theme-dark #ajna.defined .shape         { fill: url(#centerDefinedGreen); }
.theme-light #head.defined .shape,
.theme-dark #head.defined .shape         { fill: url(#centerDefinedYellow); }


/* === Centers \u2014 defined highlights (G and Head glow) === */

#head.defined .hl {
  opacity: 0.67;
  fill: url(#centerDefinedYellowHighlight);
}

#g.defined .hl {
  opacity: 0.47;
  fill: url(#centerDefinedYellowHighlight);
}


/* === Centers \u2014 highlight (hover) === */

#centers .highlight .shape {
  stroke: #678a9a !important;
  stroke-width: 10 !important;
}


/* === Centers \u2014 muted === */

#centers g.muted {
  opacity: 0.3;
  pointer-events: none;
}

#centers g.muted .nums {
  display: none;
}


/* === Highlights layer === */

#channelHighlights path,
#channelHighlights polygon,
#channelHighlights rect {
  display: none;
  pointer-events: none;
  fill: #FFFFFF;
  opacity: 0.03;
}

#channelHighlights .defined {
  display: block;
}


/* === Composite (connection chart) === */

.composite #gates .defined.c1 .s { fill: #6a8bb5; }
.composite.alt #gates .defined.c1 .s { fill: #8DCBC5; }
.composite #gates .defined.c2 .s { fill: #83cbb4; }
.composite.alt #gates .defined.c2 .s { fill: #b59bcb; }
.composite #gates .defined.mixed .s { fill: #83cbb4; }
.composite.alt #gates .defined.mixed .s { fill: #b59bcb; }
.composite #gates .defined.mixed .m { fill: #6a8bb5; }
.composite.alt #gates .defined.mixed .m { fill: #8DCBC5; }

/* Dark composite \u2014 must override .theme-dark base rules that come later */
.theme-dark.composite #gates .defined.c1 .s { fill: #6a8bb5; }
.theme-dark.composite #gates .defined.c2 .s { fill: #83cbb4; }
.theme-dark.composite #gates .defined.mixed .s { fill: #83cbb4; }
.theme-dark.composite #gates .defined.mixed .m { fill: #6a8bb5; }
.theme-dark.composite.alt #gates .defined.c1 .s { fill: #8DCBC5; }
.theme-dark.composite.alt #gates .defined.c2 .s { fill: #b59bcb; }
.theme-dark.composite.alt #gates .defined.mixed .s { fill: #b59bcb; }
.theme-dark.composite.alt #gates .defined.mixed .m { fill: #8DCBC5; }

.composite #channels path.defined,
.composite #channels rect.defined {
  stroke: #ffffffdb;
  stroke-width: 0;
}

.composite.alt #centers .defined .shape {
  fill: url(#centerDefinedComposite) !important;
}


/* === High-contrast highlighting === */

.high-contrast-highlighting #centers g:not(.highlight) .nums text,
.high-contrast-highlighting #centers g:not(.highlight) .nums circle {
  opacity: 0.1 !important;
}

.high-contrast-highlighting #gates g:not(.highlight):not(.high-contrast) {
  opacity: 0.1;
}

.high-contrast-highlighting #channels path.defined:not(.highlight) {
  stroke-width: 0;
}


/* ============================================================
 * DARK THEME
 * ============================================================ */

.theme-dark #figure {
  fill: #3b3b3c;
  stroke-width: 0;
}

.theme-dark #channels {
  fill: #1a1a1a;
}

.theme-dark #channels .strong {
  fill: #1a1a1a !important;
}

.theme-dark #centers .shape {
  fill: #1b1a1a;
  stroke-width: 0;
}

.theme-dark #centers circle {
  fill: #000000;
}

.theme-dark #centers g:not(.defined) .nums text {
  fill: #ffffff !important;
}

.theme-dark #centers .nums text {
  fill: #FFFFFF;
}

.theme-dark #centers .nums g.defined text {
  fill: #FFF;
}

.theme-dark #centers .defined .nums text {
  fill: #FFF;
}

.theme-dark #gates .defined:not(.inChannel) .h {
  stroke: #ffffff73;
  stroke-width: 0;
  display: initial;
}

.theme-dark .composite #gates .defined:not(.inChannel) .h {
  stroke: #ffffffdb;
  stroke-width: 0;
  display: initial;
}

.theme-dark .composite #channels path.defined,
.theme-dark .composite #channels rect.defined {
  stroke-width: 0;
}

.theme-dark #channels path.defined,
.theme-dark #channels rect.defined {
  stroke-width: 0;
}

.theme-dark #centers .highlight .shape {
  stroke: #b1c2cf !important;
}

.theme-dark #centers g.defined .nums g.defined circle {
  fill: #1a1a1a !important;
}

.theme-dark #centers g.defined .nums g.defined text {
  fill: #fff !important;
}

/* Dark \u2014 G and Head centers: undefined gate numbers need dark text on yellow fill */
.theme-dark #head.defined .nums g:not(.defined) text,
.theme-dark #g.defined .nums g:not(.defined) text {
  fill: #00000090;
  opacity: 1;
}

/* Dark \u2014 high-contrast highlighting */
.theme-dark .high-contrast-highlighting #centers g:not(.highlight) .shape {
  fill: #1b1a1a !important;
}

/* Dark \u2014 triple-color composite.
   A gate where chart-0 is activated by BOTH design and personality renders
   like a regular standard mixed gate \u2014 the personality colour on .s with the
   design-red .m band on top (the same .m overlay the standard chart uses) \u2014
   rather than a busy multi-band stripe. */

/* chart-0-only gate (c1) */
.theme-dark.composite.tripleColor #gates .defined.c0-act-0 .s {
  fill: var(--act-design) !important;
}
.theme-dark.composite.tripleColor #gates .defined.c0-act-1 .s {
  fill: var(--act-personality) !important;
}
.theme-dark.composite.tripleColor #gates .defined.c1.c0-act-0-1 .s {
  fill: var(--act-personality) !important;
}
.theme-dark.composite.tripleColor #gates .defined.c1.c0-act-0-1 .m {
  display: block;
  opacity: 1;
  fill: var(--act-design) !important;
  stroke: var(--act-design);
  stroke-width: 1.5;
  paint-order: stroke fill;
}

/* both-charts gate (mixed) \u2014 .m carries the chart-0 design/personality side */
.theme-dark.composite.tripleColor #gates .defined.c1-act-0 .m {
  fill: var(--act-design) !important;
}
.theme-dark.composite.tripleColor #gates .defined.c1-act-1 .m {
  fill: var(--act-personality) !important;
}
.theme-dark.composite.tripleColor #gates .defined.c1-act-0-1 .m {
  fill: url(#triple-activation-d) !important;
}


/* ============================================================
 * LIGHT THEME
 * ============================================================ */

.theme-light #figure {
  fill: #e1e1e1;
}

.theme-light #channels {
  fill: #FFFFFF;
  stroke-width: 0;
}

.theme-light #channels .strong {
  fill: white !important;
}

.theme-light #centers .shape {
  opacity: 1;
  fill: #fff;
  stroke: #807c7c;
  stroke-width: 0;
}

.theme-light #centers circle {
  fill: #ffffff;
  fill-opacity: 0.7;
}

.theme-light #centers > g:not(.defined) circle {
  fill-opacity: 1;
}

.theme-light #centers g:not(.defined) .nums text {
  fill: #00000080;
}

.theme-light #centers .nums text {
  fill: #000000;
}

/* Undefined gate numbers inside defined centers need white text
   to be readable against the dark center fill colors (brown, red, green).
   Head and G centers (yellow fill) override this back to dark below. */
.theme-light #centers .defined .nums text {
  fill: #FFFFFF;
}

.theme-light #centers .nums g.defined text {
  fill: #000;
}

.theme-light #channels path.defined,
.theme-light #channels rect.defined {
  stroke: #00000054;
  stroke-width: 4;
}

/* Connection (composite) charts read as flat color bars and should have no
 * channel outline \u2014 matching dark mode and the .composite base rule above.
 * The generic .theme-light outline rule has equal specificity and comes later,
 * so without this same-element (.theme-light.composite) override it would win
 * and re-add the 4px outline on connection charts. */
.theme-light.composite #channels path.defined,
.theme-light.composite #channels rect.defined {
  stroke-width: 0;
}

/* Composite gate fills (teal/blue/purple) differ from the design/personality
 * base colors that drive the seam-masking stroke on \`#gates .defined .s\`, so
 * that stroke shows as a thin mismatched outline (e.g. red around a blue gate).
 * Drop it for connection charts in light mode to keep the flat look. */
.theme-light.composite #gates .defined .s {
  stroke: none;
}

.theme-light #centers .highlight .shape {
  stroke: #526f8a !important;
}

.theme-light #centers g.defined .nums g.defined circle {
  fill: #ffffff !important;
}

.theme-light #centers g.defined .nums g.defined text {
  fill: #333b42 !important;
}

/* Light \u2014 high-contrast highlighting */
.theme-light .high-contrast-highlighting #centers g:not(.highlight) .shape {
  fill: #fff !important;
}

/* Light \u2014 G and Head centers: undefined gate numbers are semi-visible */
.theme-light #head.defined .nums g:not(.defined) text,
.theme-light #g.defined .nums g:not(.defined) text {
  fill: #00000090;
  opacity: 1;
}

/* Light \u2014 triple-color composite (see the dark block for the rationale). */

/* chart-0-only gate (c1) */
.theme-light.composite.tripleColor #gates .defined.c0-act-0 .s {
  fill: var(--act-design) !important;
}
.theme-light.composite.tripleColor #gates .defined.c0-act-1 .s {
  fill: var(--act-personality) !important;
}
.theme-light.composite.tripleColor #gates .defined.c1.c0-act-0-1 .s {
  fill: var(--act-personality) !important;
}
.theme-light.composite.tripleColor #gates .defined.c1.c0-act-0-1 .m {
  display: block;
  opacity: 1;
  fill: var(--act-design) !important;
  stroke: var(--act-design);
  stroke-width: 1.5;
  paint-order: stroke fill;
}

/* both-charts gate (mixed) \u2014 .m carries the chart-0 design/personality side */
.theme-light.composite.tripleColor #gates .defined.c1-act-0 .m {
  fill: var(--act-design) !important;
}
.theme-light.composite.tripleColor #gates .defined.c1-act-1 .m {
  fill: var(--act-personality) !important;
}
.theme-light.composite.tripleColor #gates .defined.c1-act-0-1 .m {
  fill: url(#triple-activation-l) !important;
}
`;
