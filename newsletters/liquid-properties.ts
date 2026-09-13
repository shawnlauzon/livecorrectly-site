import { Liquid } from 'liquidjs';
import { emailMarked } from '@/emails/markdown-renderer';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';
import type { LiquidSectionMap } from './loader';
import contactProperties from './contact-properties';

/**
 * Liquid template engine for newsletter conditional blocks and output tags.
 *
 * Newsletters can contain:
 * - Liquid conditionals: {% if career_type == "Builder" %} etc.
 * - Liquid output tags: {{ strategy }}, {{ inner_authority }} etc.
 * - Resend contact vars: {{{contact.strategy}}}, {{{FIRST_NAME|there}}} etc.
 *
 * For broadcast delivery, conditionals must be pre-rendered into Resend contact
 * properties (since broadcasts can't run per-subscriber logic at send time).
 * Output tags are converted to Resend contact property syntax so Resend
 * resolves them at send time.
 *
 * Pipeline:
 * 1. extractDynamicSections() splits markdown into static + dynamic segments
 *    (handles both {% if %} blocks and {{ var | filter }} output tags)
 * 2. replaceLiquidOutputTags() converts simple {{ var }} to {{{contact.var|}}}
 * 3. renderDynamicSection() runs Liquid + markdown→HTML for one subscriber
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

/** Default Resend fields that don't need the `contact.` prefix. */
const RESEND_DEFAULT_FIELDS = new Set(['FIRST_NAME', 'LAST_NAME', 'EMAIL']);

/**
 * Template variables handled by replaceVars() in the rendering pipeline.
 * These must NOT be converted to Resend contact property syntax.
 */
const TEMPLATE_VARS = new Set(['firstName', 'appUrl', 'chartUrl']);

/** Known contact property keys from the registry. */
const KNOWN_CONTACT_KEYS = new Set(Object.keys(contactProperties));

/** Check whether markdown contains any Liquid conditional blocks. */
export function hasLiquidConditionals(markdown: string): boolean {
  return /\{%[-\s]*if\b/.test(markdown);
}

/**
 * Check whether markdown contains Liquid output tags ({{ var }}).
 * Excludes template variables handled by replaceVars().
 */
export function hasLiquidOutputTags(markdown: string): boolean {
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\|[^}]*)?\s*\}\}/g;
  let match;
  while ((match = re.exec(markdown)) !== null) {
    const varName = match[1];
    if (!TEMPLATE_VARS.has(varName)) return true;
  }
  return false;
}

/** A dynamic section extracted from newsletter markdown. */
export interface DynamicSection {
  /** 0-indexed position in the split result */
  index: number;
  /** The raw Liquid+markdown source for this section */
  source: string;
  /** Contact property key: nl_NN_sN */
  propertyKey: string;
}

export interface ExtractionResult {
  /** The broadcast template with dynamic sections replaced by {{{contact.key|}}} */
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
  existingMap: LiquidSectionMap,
): { template: string; sections: DynamicSection[]; sectionMap: LiquidSectionMap } {
  const nlPrefix = `nl_${String(newsletterNumber).padStart(2, '0')}`;
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

    // Default Resend fields: {{{FIRST_NAME|}}}, {{{LAST_NAME|}}}, etc.
    if (RESEND_DEFAULT_FIELDS.has(varName)) {
      return `{{{${varName}|}}}`;
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
 * Split newsletter markdown into static template + dynamic sections.
 *
 * Static parts stay in the broadcast template as-is. Each dynamic section
 * (containing Liquid conditionals or filtered output tags) is extracted
 * and replaced with a Resend contact property placeholder.
 *
 * When an existing map is provided, property keys are reused for sections
 * at the same position. New sections get the next available index.
 *
 * @param markdown - Raw newsletter markdown (after channel conditionals are resolved)
 * @param newsletterNumber - Newsletter number for property key naming
 * @param existingMap - Optional stored map for stable key assignment
 */
export function extractDynamicSections(
  markdown: string,
  newsletterNumber: number,
  existingMap?: LiquidSectionMap | null,
): ExtractionResult {
  const nlPrefix = `nl_${String(newsletterNumber).padStart(2, '0')}`;
  const sections: DynamicSection[] = [];

  // Start from existing map state or fresh
  let nextIndex = existingMap?.nextIndex ?? 1;
  const oldKeys = existingMap?.keys ?? [];
  let conditionalIndex = 0;

  // Pass 1: Extract {% if %} conditional blocks
  const afterConditionals = markdown.replace(LIQUID_BLOCK_RE, (match) => {
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
 * Variable names match the contact property registry (newsletters/contact-properties.ts)
 * so both Variable nodes and Conditional nodes reference the same names:
 * - `career_type` = "Builder", "Advisor", etc. (BG5 career design)
 * - `type` = "Generator", "Projector", etc. (traditional HD type)
 * - Boolean flags: `isBuilder`, `isAdvisor`, etc.
 * - Snake_case chart fields: `strategy`, `inner_authority`, etc.
 */
export function buildLiquidContext(chart: EmailChartData): Record<string, string | boolean> {
  return {
    // Contact property names (snake_case) — canonical names for both nodes
    career_type: chart.careerDesign,
    type: chart.type,
    strategy: chart.strategy,
    inner_authority: chart.innerAuthority,
    inner_authority_description: chart.innerAuthorityDescription,
    signature_theme: chart.signatureTheme,
    not_self_theme: chart.notSelfTheme,
    decision_making_strategy: chart.decisionMakingStrategy,

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
 * Render a single dynamic section for one subscriber.
 *
 * Runs Liquid engine to resolve conditionals, then renders the resulting
 * markdown to inline-styled HTML (email format).
 *
 * @returns HTML string for this section, or empty string if the subscriber
 *          doesn't match any conditional branch.
 */
export async function renderDynamicSection(
  sectionMarkdown: string,
  chart: EmailChartData,
): Promise<string> {
  const context = buildLiquidContext(chart);
  const resolved = await engine.parseAndRender(sectionMarkdown, context);

  // If all conditionals resolved to empty, skip rendering
  const trimmed = resolved.trim();
  if (!trimmed) return '';

  // Render markdown → email-styled HTML
  return emailMarked.parse(trimmed) as string;
}

/**
 * Build all dynamic contact properties for one subscriber.
 *
 * For each dynamic section in the newsletter, runs Liquid + markdown→HTML
 * and returns a map of property keys to rendered HTML values.
 *
 * @returns Record<string, string> — keys are property names (e.g. "nl_07_s1"),
 *          values are rendered HTML. Empty sections produce empty string values.
 */
export async function buildDynamicContactProperties(
  markdown: string,
  chart: EmailChartData,
  newsletterNumber: number,
  existingMap?: LiquidSectionMap | null,
): Promise<Record<string, string>> {
  const { sections } = extractDynamicSections(markdown, newsletterNumber, existingMap);
  const properties: Record<string, string> = {};

  for (const section of sections) {
    properties[section.propertyKey] = await renderDynamicSection(
      section.source,
      chart,
    );
  }

  return properties;
}
