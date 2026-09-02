import * as React from 'react';
import { Section, Text, Link } from 'react-email';
import { EmailLayout } from './components/email-layout';
import type { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { Newsletter04Personalization } from '@/newsletters/personalizations/04';
import { Newsletter05Personalization } from '@/newsletters/personalizations/05';

interface NewsletterTemplateProps {
  preview: string;
  bodyHtml: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
  number: number;
  webUrl: string | null;
  ps: string | null;
}

/**
 * Map of newsletter number → personalization component.
 * Newsletters without an entry render normally with no per-type section.
 */
const personalizations: Record<number, React.ComponentType<{ chart: EmailChartData }>> = {
  4: Newsletter04Personalization,
  5: Newsletter05Personalization,
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
  number,
  webUrl,
  ps
}: NewsletterTemplateProps) {
  const postscripts = ps
    ? [<span key="ps" dangerouslySetInnerHTML={{ __html: ps }} />]
    : [];

  const bottomNote = webUrl ? (
    <Section>
      <Text className="mt-[24px] text-[13px] leading-[20px] text-[#6E688A] text-center">
        <Link href={webUrl} className="text-[#6A4BD6] underline">
          Read on the web
        </Link>
        {' \u2014 '}
        a shareable version without the personalized sections.
      </Text>
    </Section>
  ) : undefined;

  return (
    <EmailLayout
      preview={preview}
      unsubscribeUrl={unsubscribeUrl}
      postscripts={postscripts}
      bottomNote={bottomNote}
    >
      <Section>
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </Section>

      <NewsletterPersonalization number={number} chart={chart} />
    </EmailLayout>
  );
}
