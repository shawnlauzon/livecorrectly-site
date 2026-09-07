/**
 * Web personalization for Newsletter #8 — Neurodivergence and Human Design.
 * Replace the placeholder paragraphs below with per-type neurodivergence advice.
 */
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';

export default function Newsletter08WebPersonalization({ chart }: { chart: EmailChartData }): React.ReactNode {
  if (chart.isManifestor) {
    return (
      <>
        <p>As an {chart.careerDesign}, neurodivergence advice placeholder.</p>
      </>
    );
  }

  if (chart.isPureGenerator) {
    return (
      <>
        <p>As a {chart.careerDesign}, neurodivergence advice placeholder.</p>
      </>
    );
  }

  if (chart.isManifestingGenerator) {
    return (
      <>
        <p>As an {chart.careerDesign}, neurodivergence advice placeholder.</p>
      </>
    );
  }

  if (chart.isProjector) {
    return (
      <>
        <p>As an {chart.careerDesign}, neurodivergence advice placeholder.</p>
      </>
    );
  }

  if (chart.isReflector) {
    return (
      <>
        <p>As an {chart.careerDesign}, neurodivergence advice placeholder.</p>
      </>
    );
  }

  return null;
}
