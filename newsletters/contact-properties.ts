import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';

/**
 * Contact property registry for {{{contact.key}}} template variables in newsletter markdown.
 *
 * Each key becomes a Resend contact property (synced just-in-time before broadcasts)
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
  decision_making_strategy:    chart => chart.decisionMakingStrategy,
};

export default contactProperties;
