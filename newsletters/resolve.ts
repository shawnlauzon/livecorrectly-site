import { Liquid } from 'liquidjs';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';
import type { LiquidSectionMap } from './loader';

// =============================================================================
// Contact property registry
// =============================================================================

/**
 * Contact property registry for {{{contact.key}}} template variables in newsletter markdown.
 *
 * Each key becomes a Resend contact property (synced before newsletter sends)
 * and a web-resolvable template variable. To add a new property, just add a new entry here.
 *
 * Values are extracted from the subscriber's parsed chart data.
 */
const contactProperties: Record<string, (chart: EmailChartData) => string> = {
  career_type:                 chart => chart.careerDesign,
  type:                        chart => chart.type,
  strategy:                    chart => chart.strategy,
  inner_authority:             chart => chart.innerAuthority,
  inner_authority_description: chart => chart.innerAuthorityDescription,
  signature_theme:             chart => chart.signatureTheme,
  not_self_theme:              chart => chart.notSelfTheme,
  not_self_theme_adjective:    chart => chart.notSelfThemeAdjective,
  decision_making_strategy:    chart => chart.decisionMakingStrategy,
  authority_short:             chart => chart.innerAuthorityShortName,
  top_shadow:                  chart => chart.topShadowName ?? '',
  top_shadow_description:      chart => chart.topShadowDescription ?? '',
};

export default contactProperties;

// =============================================================================
// Contact property value extraction
// =============================================================================

/**
 * Run all contact property extractors against a chart, returning a flat
 * key→value map. Used for both Resend contact sync and web preview rendering.
 */
export function buildContactPropertyValues(
  chart: EmailChartData,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, extract] of Object.entries(contactProperties)) {
    values[key] = extract(chart);
  }
  return values;
}

// =============================================================================
// Contact variable resolution ({{{contact.key}}})
// =============================================================================

/**
 * Regex matching {{{contact.key}}} and {{{contact.key|fallback}}}.
 *
 * Triple braces are Resend's native contact property syntax. In newsletter
 * sends via the Resend Broadcast API, Resend resolves them at send time.
 * For web rendering and admin preview, we resolve them here from chart data.
 */
const CONTACT_VAR_RE = /\{\{\{contact\.([a-z_]+)(?:\|([^}]*))?\}\}\}/g;

export { CONTACT_VAR_RE };

/**
 * Replace {{{contact.key}}} and {{{contact.key|fallback}}} in text.
 *
 * - When `chart` is provided: resolves known registry properties from the chart,
 *   leaves unknown patterns as-is (for Resend to handle at send time).
 * - When `chart` is null: uses the fallback value if present, otherwise empty string.
 */
export function resolveContactVars(
  text: string,
  chart: EmailChartData | null,
): string {
  return text.replace(CONTACT_VAR_RE, (match, key: string, fallback?: string) => {
    if (chart === null) {
      return fallback ?? '';
    }

    const extract = contactProperties[key];
    if (!extract) {
      // Unknown property — leave as-is for Resend to resolve
      return match;
    }

    return extract(chart);
  });
}

// =============================================================================
// Liquid template engine
// =============================================================================

/**
 * Liquid template engine for newsletter conditional blocks and output tags.
 *
 * Newsletters can contain:
 * - Liquid conditionals: {% if career_type == "Builder" %} etc.
 * - Liquid output tags: {{ strategy }}, {{ inner_authority }} etc.
 * - Resend contact vars: {{{contact.strategy}}}, {{{FIRST_NAME|there}}} etc.
 *
 * For Resend Broadcast API delivery, conditionals must be pre-rendered into
 * contact properties (since the Broadcast API can't run per-subscriber logic
 * at send time). Output tags are converted to Resend contact property syntax
 * so Resend resolves them at send time.
 *
 * Pipeline:
 * 1. extractDynamicSections() splits HTML into static + dynamic segments
 *    (handles both {% if %} blocks and {{ var | filter }} output tags)
 * 2. replaceLiquidOutputTags() converts simple {{ var }} to {{{contact.var|}}}
 * 3. renderDynamicSection() runs Liquid on extracted HTML for one subscriber
 * 4. buildDynamicContactProperties() returns all properties for one subscriber
 */

const engine = new Liquid();

/**
 * Regex that matches a contiguous block of Liquid conditional logic.
 *
 * Matches from the first {% if ... %} through matching {% endif %},
 * including any {% elsif %} or {% else %} branches in between.
 * Handles the common pattern of multiple {% elsif %} blocks.
 *
 * Does NOT handle nested {% if %} — not needed for our newsletter templates.
 */
const LIQUID_BLOCK_RE =
  /^[ \t]*\{%[-\s]if\b[\s\S]*?\{%[-\s]endif\s*[-]?%\}\s*$/gm;

/**
 * Regex matching Liquid output tags: {{ var }}, {{ var | filter }}, {{ var | filter: arg }}.
 * Captures the variable name and optional filter portion.
 * Does NOT match triple-brace Resend syntax ({{{...}}}).
 */
const LIQUID_OUTPUT_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\|\s*([^}]+?))?\s*\}\}/g;

/**
 * Resend default identity fields — maps variable names (both lowercase editor
 * names and legacy uppercase names) to the Resend field name.
 */
const RESEND_IDENTITY_MAP: Record<string, string> = {
  first_name: 'FIRST_NAME',
  last_name: 'LAST_NAME',
  email: 'EMAIL',
  FIRST_NAME: 'FIRST_NAME',
  LAST_NAME: 'LAST_NAME',
  EMAIL: 'EMAIL',
};

/**
 * Template variables handled by replaceVars() in the rendering pipeline.
 * These must NOT be converted to Resend contact property syntax.
 */
const TEMPLATE_VARS = new Set(['firstName', 'appUrl', 'chartUrl']);

/** Known contact property keys from the registry. */
const KNOWN_CONTACT_KEYS = new Set(Object.keys(contactProperties));

/** Check whether content contains any Liquid conditional blocks. */
export function hasLiquidConditionals(content: string): boolean {
  return /\{%[-\s]*if\b/.test(content);
}

/**
 * Check whether content contains Liquid output tags ({{ var }}).
 * Excludes template variables handled by replaceVars().
 */
export function hasLiquidOutputTags(content: string): boolean {
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\|[^}]*)?\s*\}\}/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    const varName = match[1];
    if (!TEMPLATE_VARS.has(varName)) return true;
  }
  return false;
}

/** A dynamic section extracted from newsletter HTML. */
export interface DynamicSection {
  /** 0-indexed position in the split result */
  index: number;
  /** The raw Liquid+HTML source for this section */
  source: string;
  /** Contact property key: n{id}_NN_sN */
  propertyKey: string;
}

export interface ExtractionResult {
  /** The Resend Broadcast API template with dynamic sections replaced by {{{contact.key|}}} */
  broadcastTemplate: string;
  /** The dynamic sections that need per-subscriber rendering */
  sections: DynamicSection[];
  /** Updated section map (for persistence) */
  sectionMap: LiquidSectionMap;
}

/**
 * Replace Liquid output tags with Resend contact property syntax.
 *
 * - `{{ var }}` where var is a known contact property → `{{{contact.var|}}}`
 * - `{{ VAR }}` where VAR is a default Resend field → `{{{VAR|}}}`
 * - `{{ var | filter }}` → extracted as a dynamic section (filter requires per-subscriber rendering)
 * - Template vars (firstName, appUrl, chartUrl) are left untouched
 *
 * @returns Updated template, any new dynamic sections, and updated section map
 */
export function replaceLiquidOutputTags(
  template: string,
  newsletterNumber: number,
  newsletterId: number,
  existingMap: LiquidSectionMap,
): { template: string; sections: DynamicSection[]; sectionMap: LiquidSectionMap } {
  const nlPrefix = `n${newsletterId}_${String(newsletterNumber).padStart(2, '0')}`;
  const sections: DynamicSection[] = [];
  let { keys, nextIndex } = existingMap;
  keys = [...keys]; // clone to avoid mutating input

  const replaced = template.replace(LIQUID_OUTPUT_RE, (match, varName: string, filter?: string) => {
    // Skip template variables — handled by replaceVars()
    if (TEMPLATE_VARS.has(varName)) return match;

    // If the tag has a filter, it needs per-subscriber rendering (extract as dynamic section)
    if (filter && filter.trim()) {
      const propertyKey = `${nlPrefix}_s${nextIndex}`;
      nextIndex++;
      keys.push(propertyKey);
      sections.push({
        index: nextIndex - 1,
        source: match,
        propertyKey,
      });
      return `{{{contact.${propertyKey}|}}}`;
    }

    // Default Resend identity fields: {{{FIRST_NAME|}}}, {{{LAST_NAME|}}}, etc.
    const resendField = RESEND_IDENTITY_MAP[varName];
    if (resendField) {
      return `{{{${resendField}|}}}`;
    }

    // Known contact property: {{{contact.var|}}}
    if (KNOWN_CONTACT_KEYS.has(varName)) {
      return `{{{contact.${varName}|}}}`;
    }

    // Unknown variable — leave as-is (will be empty after Liquid rendering)
    return match;
  });

  return {
    template: replaced,
    sections,
    sectionMap: { keys, nextIndex },
  };
}

/**
 * Split newsletter HTML into static template + dynamic sections.
 *
 * Static parts stay in the template as-is. Each dynamic section
 * (containing Liquid conditionals or filtered output tags) is extracted
 * and replaced with a Resend contact property placeholder.
 *
 * When an existing map is provided, property keys are reused for sections
 * at the same position. New sections get the next available index.
 *
 * @param html - Newsletter HTML from the visual editor
 * @param newsletterNumber - Newsletter number for property key naming
 * @param existingMap - Optional stored map for stable key assignment
 */
export function extractDynamicSections(
  html: string,
  newsletterNumber: number,
  newsletterId: number,
  existingMap?: LiquidSectionMap | null,
): ExtractionResult {
  const nlPrefix = `n${newsletterId}_${String(newsletterNumber).padStart(2, '0')}`;
  const sections: DynamicSection[] = [];

  // Start from existing map state or fresh
  let nextIndex = existingMap?.nextIndex ?? 1;
  const oldKeys = existingMap?.keys ?? [];
  let conditionalIndex = 0;

  // Pass 1: Extract {% if %} conditional blocks
  const afterConditionals = html.replace(LIQUID_BLOCK_RE, (match) => {
    let propertyKey: string;

    if (conditionalIndex < oldKeys.length) {
      // Reuse existing key at this position
      propertyKey = oldKeys[conditionalIndex];
    } else {
      // Allocate new key
      propertyKey = `${nlPrefix}_s${nextIndex}`;
      nextIndex++;
    }
    conditionalIndex++;

    sections.push({
      index: conditionalIndex,
      source: match,
      propertyKey,
    });

    return `{{{contact.${propertyKey}|}}}`;
  });

  // Build initial map from conditional sections
  const conditionalKeys = sections.map(s => s.propertyKey);

  // Pass 2: Replace simple Liquid output tags ({{ var }}) with Resend syntax
  const currentMap: LiquidSectionMap = {
    keys: conditionalKeys,
    nextIndex,
  };
  const outputResult = replaceLiquidOutputTags(
    afterConditionals,
    newsletterNumber,
    newsletterId,
    currentMap,
  );

  // Merge results
  const allSections = [...sections, ...outputResult.sections];
  const allKeys = outputResult.sectionMap.keys;

  return {
    broadcastTemplate: outputResult.template,
    sections: allSections,
    sectionMap: {
      keys: allKeys,
      nextIndex: outputResult.sectionMap.nextIndex,
    },
  };
}

/**
 * Build a Liquid context object from EmailChartData.
 *
 * Variable names match the contact property registry so both Variable nodes
 * and Conditional nodes reference the same names:
 * - `career_type` = "Builder", "Advisor", etc. (BG5 career design)
 * - `type` = "Generator", "Projector", etc. (traditional HD type)
 * - Boolean flags: `isBuilder`, `isAdvisor`, etc.
 * - Snake_case chart fields: `strategy`, `inner_authority`, etc.
 */
export function buildLiquidContext(
  chart: EmailChartData,
  mode: 'web' | 'email' = 'email',
): Record<string, string | boolean> {
  return {
    mode,
    // Contact property names (snake_case) — canonical names for both nodes
    career_type: chart.careerDesign,
    type: chart.type,
    strategy: chart.strategy,
    inner_authority: chart.innerAuthority,
    inner_authority_description: chart.innerAuthorityDescription,
    signature_theme: chart.signatureTheme,
    not_self_theme: chart.notSelfTheme,
    not_self_theme_adjective: chart.notSelfThemeAdjective,
    decision_making_strategy: chart.decisionMakingStrategy,
    authority_short: chart.innerAuthorityShortName,
    top_shadow: chart.topShadowName ?? '',
    top_shadow_description: chart.topShadowDescription ?? '',

    // Boolean flags
    isBuilder: chart.isGenerator,
    isClassicBuilder: chart.isPureGenerator,
    isExpressBuilder: chart.isManifestingGenerator,
    isInitiator: chart.isManifestor,
    isAdvisor: chart.isProjector,
    isEvaluator: chart.isReflector,
    isEmotional: chart.isEmotionalAuthority,
  };
}

/**
 * Decode HTML entities inside Liquid delimiters ({{ }} and {% %}).
 *
 * The TipTap editor encodes characters like `'` as `&#x27;` in its HTML output.
 * This is correct for HTML content but breaks Liquid parsing — e.g.
 * `{{ name | default: &#x27;there&#x27; }}` is invalid Liquid syntax.
 *
 * Only decodes within Liquid tags to avoid altering surrounding HTML.
 */
const HTML_ENTITY_MAP: Record<string, string> = {
  '&#x27;': "'",
  '&#39;': "'",
  '&apos;': "'",
  '&#x22;': '"',
  '&#34;': '"',
  '&quot;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
};
const HTML_ENTITY_RE = /&#x27;|&#39;|&apos;|&#x22;|&#34;|&quot;|&amp;|&lt;|&gt;/g;

function decodeLiquidEntities(html: string): string {
  // Match both {{ ... }} output tags and {% ... %} control tags
  return html.replace(
    /(\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\})/g,
    (tag) => tag.replace(HTML_ENTITY_RE, (entity) => HTML_ENTITY_MAP[entity] ?? entity),
  );
}

/**
 * Resolve Liquid conditionals and output tags in HTML.
 *
 * This is the single code path for all Liquid processing — used by:
 * - Web rendering (newsletters/web.ts)
 * - Email rendering (emails/newsletter-loader.ts)
 * - Admin editor preview (via /api/admin/newsletters/preview)
 *
 * If the HTML contains no Liquid tags, returns it unchanged.
 */
export async function resolveLiquid(
  html: string,
  options?: {
    chart?: EmailChartData | null;
    mode?: 'web' | 'email';
    firstName?: string;
    lastName?: string;
    email?: string;
  },
): Promise<string> {
  if (!hasLiquidConditionals(html) && !hasLiquidOutputTags(html)) {
    return html;
  }

  const ctx: Record<string, string | boolean> = options?.chart
    ? buildLiquidContext(options.chart, options?.mode ?? 'email')
    : { mode: (options?.mode ?? 'email') as string };

  // Identity fields for Variable node output tags (e.g. {{ first_name | default: 'there' }})
  if (options?.firstName !== undefined) {
    ctx.first_name = options.firstName;
    ctx.FIRST_NAME = options.firstName;
  }
  if (options?.lastName !== undefined) {
    ctx.last_name = options.lastName;
    ctx.LAST_NAME = options.lastName;
  }
  if (options?.email !== undefined) {
    ctx.email = options.email;
    ctx.EMAIL = options.email;
  }

  // The TipTap editor encodes quotes as &#x27; when serializing to HTML.
  // Liquid can't parse HTML entities inside its tags, so decode them first.
  // Only decode inside Liquid delimiters ({{ }}, {% %}) to avoid altering
  // the surrounding HTML.
  const decoded = decodeLiquidEntities(html);

  return engine.parseAndRender(decoded, ctx);
}

/**
 * Render a single dynamic section for one subscriber.
 *
 * Runs Liquid engine to resolve conditionals in the extracted HTML section.
 *
 * @returns HTML string for this section, or empty string if the subscriber
 *          doesn't match any conditional branch.
 */
export async function renderDynamicSection(
  sectionHtml: string,
  chart: EmailChartData,
): Promise<string> {
  const context = buildLiquidContext(chart);
  const decoded = decodeLiquidEntities(sectionHtml);
  const resolved = await engine.parseAndRender(decoded, context);

  // If all conditionals resolved to empty, skip rendering
  return resolved.trim();
}

/**
 * Build all dynamic contact properties for one subscriber.
 *
 * For each dynamic section in the newsletter, runs Liquid and returns
 * a map of property keys to rendered HTML values.
 *
 * @returns Record<string, string> — keys are property names (e.g. "n1_07_s1"),
 *          values are rendered HTML. Empty sections produce empty string values.
 */
export async function buildDynamicContactProperties(
  html: string,
  chart: EmailChartData,
  newsletterNumber: number,
  newsletterId: number,
  existingMap?: LiquidSectionMap | null,
): Promise<Record<string, string>> {
  const { sections } = extractDynamicSections(html, newsletterNumber, newsletterId, existingMap);
  const properties: Record<string, string> = {};

  for (const section of sections) {
    properties[section.propertyKey] = await renderDynamicSection(
      section.source,
      chart,
    );
  }

  return properties;
}

// =============================================================================
// Relative link resolution
// =============================================================================

/**
 * Resolve `<a>` tags marked with `data-relative="true"` into full subscriber
 * chart-page URLs. If no subscriberId is available the `<a>` tag is stripped,
 * leaving just the link text.
 *
 * Attribute order in HTML is unpredictable, so we match any `<a>` containing
 * the data-relative attribute regardless of where it appears relative to href.
 */
export function resolveRelativeLinks(
  html: string,
  subscriberId: string | undefined,
  newsletterNumber: number,
): string {
  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';

  // Match <a ...data-relative="true"...>text</a> — attribute order varies
  return html.replace(
    /<a\b([^>]*?\bdata-relative="true"[^>]*)>([\s\S]*?)<\/a\s*>/gi,
    (_match, attrs: string, text: string) => {
      if (!subscriberId) return text;

      // Extract href value
      const hrefMatch = attrs.match(/\bhref="([^"]*)"/);
      if (!hrefMatch) return text;
      const path = hrefMatch[1];

      const url = `${appUrl}/see-your-design/${subscriberId}${path}?utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_${newsletterNumber}`;

      // Rebuild attrs: replace href with resolved URL and strip data-relative
      const newAttrs = attrs
        .replace(/\bhref="[^"]*"/, `href="${url}"`)
        .replace(/\s*\bdata-relative="true"/, '');

      return `<a${newAttrs}>${text}</a>`;
    },
  );
}

// =============================================================================
// Orchestrator — single entry point for the resolution pipeline
// =============================================================================

/**
 * Resolve newsletter HTML through the full pipeline:
 * 1. Resolve Liquid conditionals and output tags
 * 2. Resolve {{{contact.key}}} variables
 * 3. Resolve data-relative links
 *
 * This replaces the duplicated 3-step pipeline in web.ts and preview/route.ts.
 */
export async function resolveNewsletterHtml(
  html: string,
  options: {
    chart?: EmailChartData | null;
    firstName?: string;
    lastName?: string;
    email?: string;
    subscriberId?: string;
    newsletterNumber?: number;
    mode?: 'web' | 'email';
  },
): Promise<string> {
  let result = await resolveLiquid(html, {
    chart: options.chart,
    mode: options.mode,
    firstName: options.firstName,
    lastName: options.lastName,
    email: options.email,
  });

  result = resolveContactVars(result, options.chart ?? null);

  result = resolveRelativeLinks(
    result,
    options.subscriberId,
    options.newsletterNumber ?? 0,
  );

  return result;
}
