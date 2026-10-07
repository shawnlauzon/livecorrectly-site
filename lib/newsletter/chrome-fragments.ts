/**
 * HTML fragment functions for newsletter email chrome.
 *
 * These return inline-styled HTML strings that are injected directly into
 * the composeReactEmail() output. No React components or Tailwind classes —
 * just raw HTML with inline styles for maximum email client compatibility.
 */

import { EMAIL_BODY_FONT } from '../email/fonts';

/**
 * Permission Slip logo block — centered at the top of the email.
 * Wrapped in the same max-width table as the suffix so the logo never exceeds
 * the content width; the image scales down (width:100%) in narrower viewports.
 * Intrinsic size is 1200x400 (2x for Retina), displayed at 600x200.
 */
export function logoFragment(appUrl: string): string {
  return `<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;"><tr><td style="padding:0 0 24px;"><img src="${appUrl}/newsletter/permission-slip.png" alt="Permission Slip" width="600" height="200" style="display:block;width:100%;max-width:600px;height:auto;margin:0 auto;outline:none;border:none;text-decoration:none;" /></td></tr></table>`;
}

/** Escape text for safe inclusion in HTML content and attributes. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Hidden preheader — the inbox preview line shown next to the subject.
 * The trailing &zwnj;&nbsp; filler keeps clients from pulling body text into
 * the preview after the preheader runs out.
 */
export function preheaderFragment(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const filler = '&#8204;&nbsp;'.repeat(100);
  return `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(trimmed)}${filler}</div>`;
}

/**
 * Shared note shown above the issue body (e.g. explaining a skipped week).
 * Plain text: blank lines separate paragraphs, single newlines become <br />.
 * Wrapped in the same max-width table as the logo, with a divider below to set
 * it apart from the issue itself.
 */
export function noteFragment(text: string): string {
  const paragraphs = text
    .trim()
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
  if (!paragraphs.length) return '';
  const body = paragraphs
    .map(p => `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#292524;">${escapeHtml(p).replace(/\r?\n/g, '<br />')}</p>`)
    .join('\n');
  return `<table data-newsletter-note align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;"><tr><td style="font-family:${EMAIL_BODY_FONT};font-size:16px;padding:0 0 8px;">${body}<hr style="margin:8px 0 0;border:none;border-top:1px solid #C9C2B4;" /></td></tr></table>`;
}

/**
 * Shawn's email signature block — headshot + name + credentials.
 * Uses a table layout for consistent rendering across email clients.
 */
export function signatureFragment(appUrl: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:24px;">
  <tr>
    <td style="vertical-align:top;width:64px;">
      <img alt="Shawn Lauzon headshot" src="${appUrl}/shawn-lauzon-headshot.jpg" width="48" height="48" style="border-radius:50%;display:block;outline:none;border:none;text-decoration:none;" />
    </td>
    <td style="vertical-align:top;">
      <p style="margin:0;font-size:14px;font-weight:600;line-height:20px;color:#292524;">Shawn Lauzon</p>
      <p style="margin:0;font-size:12px;line-height:16px;color:#78716c;">Certified Human Design for Business<br />BG5 Career &amp; Business Consultant</p>
    </td>
  </tr>
</table>`;
}

/**
 * Generate postscript prefix: P.S., P.P.S., P.P.P.S., etc.
 */
function getPostscriptPrefix(index: number): string {
  if (index === 0) return 'P.S.';
  return 'P.' + 'P.'.repeat(index) + 'S.';
}

/**
 * Postscript paragraphs — italic P.S./P.P.S. blocks.
 * Each entry can contain inline HTML (from markdown parsing).
 */
export function postscriptFragments(ps: string[]): string {
  if (!ps.length) return '';
  return ps
    .filter(Boolean)
    .map(
      (content, i) =>
        `<p style="margin-top:24px;margin-bottom:16px;font-size:16px;font-style:italic;line-height:24px;color:#45585B;">${getPostscriptPrefix(i)} ${content}</p>`,
    )
    .join('\n');
}

/**
 * Footer block — horizontal rule + physical address + unsubscribe link.
 */
export function footerFragment(unsubscribeUrl: string): string {
  return `<hr style="margin:24px 0;border:none;border-top:1px solid #C9C2B4;" />
<p style="margin:0;font-size:12px;line-height:18px;color:#45585B;">Live Correctly<br />5305 Indio Drive, Austin, TX 78745</p>
<p style="margin-top:8px;margin-bottom:0;font-size:12px;line-height:18px;color:#45585B;"><a href="${unsubscribeUrl}" style="color:#45585B;text-decoration:underline;">Unsubscribe</a></p>`;
}
