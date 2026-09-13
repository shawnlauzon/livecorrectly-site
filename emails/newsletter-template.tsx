import * as React from 'react';
import { Section, Img } from 'react-email';
import { EmailLayout } from './components/email-layout';
import type { EmailChartData } from '../lib/hd-chart/parse-for-email';
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
 * Whether a newsletter requires per-subscriber rendering.
 * True if the newsletter has Liquid conditional blocks in the markdown or HTML.
 *
 * Used by the cron to decide between transactional (per-subscriber) and
 * broadcast (single API call) sending paths.
 */
export async function requiresPerSubscriberRendering(number: number): Promise<boolean> {
  const raw = await loadNewsletter(number);
  if (raw && hasLiquidConditionals(raw.bodyMarkdown)) return true;
  if (raw?.bodyHtml && hasLiquidConditionals(raw.bodyHtml)) return true;

  return false;
}

/**
 * React Email component for newsletter emails.
 * Renders pre-converted markdown HTML inside EmailLayout.
 * Per-type content is handled via Liquid conditionals in the newsletter body.
 */
export function NewsletterTemplate({
  preview,
  bodyHtml,
  image,
  chart: _chart,
  unsubscribeUrl,
  number: _number,
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
    </EmailLayout>
  );
}
