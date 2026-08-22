import * as React from 'react';
import { Section } from 'react-email';
import { EmailLayout } from './components/email-layout';
import type { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { Newsletter01Personalization } from './newsletter-personalizations/01';

interface NewsletterTemplateProps {
  preview: string;
  bodyHtml: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
  number: number;
}

/**
 * Map of newsletter number → personalization component.
 * Newsletters without an entry render normally with no per-type section.
 */
const personalizations: Record<number, React.ComponentType<{ chart: EmailChartData }>> = {
  1: Newsletter01Personalization,
};

/**
 * Renders per-type personalized content after the shared newsletter body.
 * Looks up the component by newsletter number; returns null when no
 * personalization exists for that issue.
 */
function NewsletterPersonalization({ number, chart }: { number: number; chart: EmailChartData }) {
  const Component = personalizations[number];
  if (!Component) return null;
  return <Component chart={chart} />;
}

/**
 * React Email component for newsletter emails.
 * Renders pre-converted markdown HTML inside EmailLayout,
 * then appends a personalization section (placeholder for now).
 */
export function NewsletterTemplate({
  preview,
  bodyHtml,
  chart,
  unsubscribeUrl,
  number
}: NewsletterTemplateProps) {
  return (
    <EmailLayout preview={preview} unsubscribeUrl={unsubscribeUrl}>
      <Section>
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </Section>

      <NewsletterPersonalization number={number} chart={chart} />
    </EmailLayout>
  );
}
