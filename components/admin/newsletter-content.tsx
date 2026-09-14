'use client';

interface NewsletterContentProps {
  html: string;
  className?: string;
}

/**
 * Renders pre-resolved newsletter HTML. A thin semantic wrapper around
 * dangerouslySetInnerHTML — all resolution (Liquid, contact vars, relative
 * links) must happen before the HTML reaches this component.
 */
export function NewsletterContent({ html, className }: NewsletterContentProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
