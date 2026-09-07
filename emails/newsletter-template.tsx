import * as React from 'react';
import { Button, Section, Text, Link, Img } from 'react-email';
import { EmailLayout } from './components/email-layout';
import type { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { Newsletter04Personalization } from '@/newsletters/personalizations/04';
import { Newsletter05Personalization } from '@/newsletters/personalizations/05';
import { hasWebPersonalization } from '@/newsletters/personalizations/web';

interface NewsletterTemplateProps {
  preview: string;
  bodyHtml: string;
  /** Hero image filename, or null to skip */
  image: string | null;
  chart: EmailChartData;
  unsubscribeUrl: string;
  number: number;
  webUrl: string | null;
  ps: string | null;
  /** Subscriber UUID — used to build personalized web links */
  subscriberId: string | null;
  /** Newsletter slug — used to build personalized web links */
  slug: string | null;
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
  image,
  chart,
  unsubscribeUrl,
  number,
  webUrl,
  ps,
  subscriberId,
  slug,
}: NewsletterTemplateProps) {
  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
  const postscripts = ps
    ? [<span key="ps" dangerouslySetInnerHTML={{ __html: ps }} />]
    : [];

  const showWebCta = hasWebPersonalization(number) && subscriberId && slug;
  const personalizedWebUrl = showWebCta
    ? `${appUrl}/newsletter/${slug}?s=${subscriberId}&utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_${number}`
    : null;

  const bottomNote = webUrl ? (
    <Section>
      <Text className="mt-[24px] text-[13px] leading-[20px] text-[#6E688A] text-center">
        <Link href={webUrl} className="text-[#6A4BD6] underline">
          Read on the web
        </Link>
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
      {image && (
        <Img
          src={`${appUrl}/newsletter/${image}`}
          alt=""
          width={536}
          style={{ display: 'block', borderRadius: '8px', marginBottom: '24px', width: '100%', height: 'auto' }}
        />
      )}
      <Section>
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </Section>

      {/* Inline personalization for newsletters that have it (04, 05) */}
      <NewsletterPersonalization number={number} chart={chart} />

      {/* CTA button for newsletters with web personalization (07+) */}
      {personalizedWebUrl && (
        <Section style={{ textAlign: 'center', marginTop: '24px' }}>
          <Button
            href={personalizedWebUrl}
            style={{
              backgroundColor: '#6A4BD6',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 600,
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            See what this means for you
          </Button>
        </Section>
      )}
    </EmailLayout>
  );
}
