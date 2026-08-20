import * as React from 'react';
import { Section } from 'react-email';
import { EmailLayout } from './components/email-layout';
import type { EmailChartData } from '../lib/hd-chart/parse-for-email';

interface NewsletterTemplateProps {
  preview: string;
  bodyHtml: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
}

/**
 * Placeholder for future personalized chart content at the end of newsletters.
 * Returns null initially — the owner will fill in conditional logic later.
 */
function NewsletterPersonalization({ chart: _chart }: { chart: EmailChartData }) {
  // TODO: Add personalized chart-specific section here.
  // This component receives the subscriber's chart data and can branch
  // on type, authority, etc. to add relevant content after the markdown body.
  return null;
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
  unsubscribeUrl
}: NewsletterTemplateProps) {
  return (
    <EmailLayout preview={preview} unsubscribeUrl={unsubscribeUrl}>
      <Section>
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </Section>

      <NewsletterPersonalization chart={chart} />
    </EmailLayout>
  );
}
