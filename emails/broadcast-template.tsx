import * as React from 'react';
import { Section } from 'react-email';
import { EmailLayout } from './components/email-layout';

interface BroadcastTemplateProps {
  preview: string;
  bodyHtml: string;
  unsubscribeUrl: string;
  /** Pre-rendered HTML postscript strings */
  postscripts: string[];
}

/**
 * React Email component for broadcast emails.
 * Renders pre-converted markdown HTML inside EmailLayout with postscripts.
 */
export function BroadcastTemplate({
  preview,
  bodyHtml,
  unsubscribeUrl,
  postscripts,
}: BroadcastTemplateProps) {
  const psElements = postscripts.map((html, i) => (
    <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
  ));

  return (
    <EmailLayout
      preview={preview}
      unsubscribeUrl={unsubscribeUrl}
      postscripts={psElements}
    >
      <Section>
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </Section>
    </EmailLayout>
  );
}
