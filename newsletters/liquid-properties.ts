import { Liquid } from 'liquidjs';
import { emailMarked } from '@/emails/markdown-renderer';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';

/**
 * Liquid template engine for newsletter conditional blocks.
 *
 * Newsletters can contain Liquid conditionals ({% if type == "Builder" %} etc.)
 * that vary per subscriber's chart data. For broadcast delivery, these must be
 * pre-rendered into Resend contact properties since broadcasts can't run
 * per-subscriber logic at send time.
 *
 * Pipeline:
 * 1. extractDynamicSections() splits markdown into static + dynamic segments
 * 2. renderDynamicSection() runs Liquid + markdown→HTML for one subscriber
 * 3. buildDynamicContactProperties() returns all properties for one subscriber
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

/** Check whether markdown contains any Liquid conditional blocks. */
export function hasLiquidConditionals(markdown: string): boolean {
  return /\{%[-\s]*if\b/.test(markdown);
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
}

/**
 * Split newsletter markdown into static template + dynamic sections.
 *
 * Static parts stay in the broadcast template as-is. Each dynamic section
 * (containing Liquid conditionals) is extracted and replaced with a
 * Resend contact property placeholder.
 *
 * @param markdown - Raw newsletter markdown (after channel conditionals are resolved)
 * @param newsletterNumber - Newsletter number for property key naming
 */
export function extractDynamicSections(
  markdown: string,
  newsletterNumber: number,
): ExtractionResult {
  const sections: DynamicSection[] = [];
  let sectionIndex = 0;

  const broadcastTemplate = markdown.replace(LIQUID_BLOCK_RE, (match) => {
    sectionIndex++;
    const propertyKey = `nl_${String(newsletterNumber).padStart(2, '0')}_s${sectionIndex}`;
    sections.push({
      index: sectionIndex,
      source: match,
      propertyKey,
    });
    // Replace with Resend contact property placeholder.
    // The | at the end provides an empty fallback (no raw placeholder shown).
    return `{{{contact.${propertyKey}|}}}`;
  });

  return { broadcastTemplate, sections };
}

/**
 * Build a Liquid context object from EmailChartData.
 *
 * Uses BG5/career-design terminology that matches newsletter writing conventions:
 * - `type` = "Builder", "Advisor", etc. (careerDesign name)
 * - `hdType` = "Generator", "Projector", etc. (traditional HD name)
 * - Boolean flags: `isBuilder`, `isAdvisor`, etc.
 * - Other chart fields: strategy, innerAuthority, etc.
 */
export function buildLiquidContext(chart: EmailChartData): Record<string, string | boolean> {
  return {
    type: chart.careerDesign,
    hdType: chart.type,
    isBuilder: chart.isGenerator,
    isClassicBuilder: chart.isPureGenerator,
    isExpressBuilder: chart.isManifestingGenerator,
    isInitiator: chart.isManifestor,
    isAdvisor: chart.isProjector,
    isEvaluator: chart.isReflector,
    isEmotional: chart.isEmotionalAuthority,
    strategy: chart.strategy,
    innerAuthority: chart.innerAuthority,
    innerAuthorityDescription: chart.innerAuthorityDescription,
    signatureTheme: chart.signatureTheme,
    notSelfTheme: chart.notSelfTheme,
    decisionMakingStrategy: chart.decisionMakingStrategy,
    careerDesign: chart.careerDesign,
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
): Promise<Record<string, string>> {
  const { sections } = extractDynamicSections(markdown, newsletterNumber);
  const properties: Record<string, string> = {};

  for (const section of sections) {
    properties[section.propertyKey] = await renderDynamicSection(
      section.source,
      chart,
    );
  }

  return properties;
}
