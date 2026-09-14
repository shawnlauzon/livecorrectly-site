'use client';

interface EmailNewsletterProps {
  /** Pre-chromed HTML (complete document with logo, signature, footer already injected) */
  html: string;
  className?: string;
}

/**
 * Renders a newsletter whose HTML already has full email chrome injected
 * (logo, signature, postscripts, footer) by the API layer via
 * renderNewsletterEmail() → injectEmailChrome().
 *
 * This component just renders the finished HTML — no further injection.
 */
export function EmailNewsletter({ html, className }: EmailNewsletterProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
