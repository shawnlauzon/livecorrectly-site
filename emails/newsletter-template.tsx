import * as React from 'react';
import { Section, Img } from 'react-email';
import { EmailLayout } from './components/email-layout';
import type { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { Newsletter04Personalization } from '@/newsletters/personalizations/04';
import { Newsletter05Personalization } from '@/newsletters/personalizations/05';
import { loadNewsletter } from '@/newsletters/loader';
import { hasLiquidConditionals } from '@/newsletters/liquid-properties';

interface NewsletterTemplateProps {
  preview: string;
  bodyHtml: string;
  /** Hero image filename, or null to skip */
  image: string | null;
  chart: EmailChartData | null;
  unsubscribeUrl: string;
  number: number;
  ps: string[];
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
 * Whether a newsletter number has inline per-subscriber personalization
 * (React components that differ per chart type).
 * Newsletters with personalization MUST be sent transactionally (one email per
 * subscriber) because the body differs per chart type. Others can use broadcasts.
 */
export function hasInlinePersonalization(number: number): boolean {
  return number in personalizations;
}

/**
 * Whether a newsletter requires per-subscriber rendering.
 * True if the newsletter has either React personalization components
 * OR Liquid conditional blocks in the markdown.
 *
 * Used by the cron to decide between transactional (per-subscriber) and
 * broadcast (single API call) sending paths.
 */
export function requiresPerSubscriberRendering(number: number): boolean {
  if (number in personalizations) return true;

  const raw = loadNewsletter(number);
  if (raw && hasLiquidConditionals(raw.bodyMarkdown)) return true;

  return false;
}

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
  ps,
}: NewsletterTemplateProps) {
  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
  const postscripts = ps.map((p, i) => (
    <span key={i} dangerouslySetInnerHTML={{ __html: p }} />
  ));

  return (
    <EmailLayout
      preview={preview}
      unsubscribeUrl={unsubscribeUrl}
      postscripts={postscripts}
    >
      {image && (
        <Img
          src={`${appUrl}/newsletter/${image}`}
          alt=""
          width={612}
          style={{ display: 'block', borderRadius: '8px', marginBottom: '24px', width: '100%', height: 'auto' }}
        />
      )}
      <Section>
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </Section>

      {/* Inline personalization for newsletters that have it (04, 05) */}
      {chart && <NewsletterPersonalization number={number} chart={chart} />}
    </EmailLayout>
  );
}
