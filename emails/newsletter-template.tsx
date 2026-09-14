import * as React from 'react';
import { Section } from 'react-email';
import { EmailLayout } from './components/email-layout';
import type { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { loadNewsletter } from '@/newsletters/loader';
import { hasLiquidConditionals, hasLiquidOutputTags } from '@/newsletters/resolve';

interface NewsletterTemplateProps {
  preview: string;
  bodyHtml: string;
  chart: EmailChartData | null;
  unsubscribeUrl: string;
  number: number;
  ps: string[];
}

/**
 * Whether a newsletter requires per-subscriber rendering.
 * True if the newsletter has Liquid conditional blocks in the HTML.
 *
 * Used by the cron to decide between transactional (per-subscriber) and
 * broadcast (single API call) sending paths.
 */
export async function requiresPerSubscriberRendering(number: number): Promise<boolean> {
  const raw = await loadNewsletter(number);
  if (!raw) return false;
  if (hasLiquidConditionals(raw.bodyHtml)) return true;
  if (hasLiquidOutputTags(raw.bodyHtml)) return true;

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
  chart: _chart,
  unsubscribeUrl,
  number: _number,
  ps,
}: NewsletterTemplateProps) {
  const postscripts = ps.map((p, i) => (
    <span key={i} dangerouslySetInnerHTML={{ __html: p }} />
  ));

  return (
    <EmailLayout
      preview={preview}
      unsubscribeUrl={unsubscribeUrl}
      postscripts={postscripts}
    >
      <Section>
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </Section>
    </EmailLayout>
  );
}
