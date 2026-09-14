'use client';

import { NewsletterContent } from './newsletter-content';

/** Generate postscript prefix: P.S., P.P.S., P.P.P.S., etc. */
function getPostscriptPrefix(index: number): string {
  if (index === 0) return 'P.S.';
  return 'P.' + 'P.'.repeat(index) + 'S.';
}

interface EmailNewsletterProps {
  /** Pre-resolved body HTML */
  html: string;
  /** Postscript strings (plain text) */
  postscripts?: string[];
  className?: string;
}

/**
 * Renders a newsletter with full email chrome: logo, body, signature,
 * postscripts, and footer. Used in the admin editor preview and subscriber
 * detail pages. All HTML resolution must happen before reaching this component.
 */
export function EmailNewsletter({ html, postscripts, className }: EmailNewsletterProps) {
  return (
    <div className={className}>
      {/* Logo */}
      <img
        src="/newsletter/permission-slip-logo.png"
        alt="Permission Slip"
        width={381}
        height={167}
        style={{ display: 'block', margin: '0 auto 24px' }}
      />

      {/* Body */}
      <NewsletterContent html={html} />

      {/* Signature */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <img
          src="/shawn-lauzon-headshot.jpg"
          alt="Shawn Lauzon headshot"
          width={48}
          height={48}
          style={{ borderRadius: '50%', flexShrink: 0 }}
        />
        <div>
          <div style={{ margin: 0, fontSize: '14px', fontWeight: 600, lineHeight: '20px', color: '#292524' }}>
            Shawn Lauzon
          </div>
          <div style={{ margin: 0, fontSize: '12px', lineHeight: '16px', color: '#78716c' }}>
            Certified Human Design for Business<br />
            BG5 Career &amp; Business Consultant
          </div>
        </div>
      </div>

      {/* Postscripts */}
      {postscripts?.filter(Boolean).map((ps, i) => (
        <p
          key={i}
          style={{
            marginTop: '24px',
            marginBottom: '16px',
            fontSize: '16px',
            fontStyle: 'italic',
            lineHeight: '24px',
            color: '#45585B',
          }}
        >
          {getPostscriptPrefix(i)} {ps}
        </p>
      ))}

      {/* Divider */}
      <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #C9C2B4' }} />

      {/* Footer */}
      <div style={{ fontSize: '12px', lineHeight: '18px', color: '#45585B' }}>
        Live Correctly<br />
        5305 Indio Drive, Austin, TX 78745
      </div>
      <div style={{ marginTop: '8px', fontSize: '12px', lineHeight: '18px' }}>
        <span style={{ color: '#45585B', textDecoration: 'underline', cursor: 'default' }}>
          Unsubscribe
        </span>
      </div>
    </div>
  );
}
