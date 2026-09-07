/**
 * Web personalization for Newsletter #7 — Burnout.
 * Replace the placeholder paragraphs below with per-type burnout advice.
 */
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';

export default function Newsletter07WebPersonalization({ chart }: { chart: EmailChartData }): React.ReactNode {
  if (chart.isManifestor) {
    return (
      <>
        <p>As an {chart.careerDesign}, burnout advice placeholder.</p>
      </>
    );
  }

  if (chart.isPureGenerator) {
    return (
      <>
        <p>As a {chart.careerDesign}, burnout advice placeholder.</p>
      </>
    );
  }

  if (chart.isManifestingGenerator) {
    return (
      <>
        <p>As an {chart.careerDesign}, burnout advice placeholder.</p>
      </>
    );
  }

  if (chart.isProjector) {
    return (
      <>
        <p>As an {chart.careerDesign}, burnout advice placeholder.</p>
      </>
    );
  }

  if (chart.isReflector) {
    return (
      <>
        <p>As an {chart.careerDesign}, burnout advice placeholder.</p>
      </>
    );
  }

  return null;
}
