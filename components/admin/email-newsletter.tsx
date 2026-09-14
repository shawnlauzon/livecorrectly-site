'use client';

import { injectEmailChrome } from '@/emails/inject-chrome';

interface EmailNewsletterProps {
  /** Pre-resolved body HTML (complete document from composeReactEmail) */
  html: string;
  /** Postscript strings (plain text) */
  postscripts?: string[];
  className?: string;
}

/**
 * Renders a newsletter with full email chrome: logo, body, signature,
 * postscripts, and footer. Uses the same injection logic as real email
 * sending so the preview matches what subscribers receive.
 *
 * All HTML resolution must happen before reaching this component.
 */
export function EmailNewsletter({ html, postscripts, className }: EmailNewsletterProps) {
  // Inject chrome into the composeReactEmail HTML using the same function
  // as the real send path. Use relative appUrl since this renders in the browser.
  const injected = injectEmailChrome(html, {
    appUrl: '',
    unsubscribeUrl: '#',
    postscripts: postscripts?.filter(Boolean) ?? [],
  });

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: injected }}
    />
  );
}
