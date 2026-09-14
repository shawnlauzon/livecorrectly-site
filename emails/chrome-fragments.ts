/**
 * HTML fragment functions for newsletter email chrome.
 *
 * These return inline-styled HTML strings that are injected directly into
 * the composeReactEmail() output. No React components or Tailwind classes —
 * just raw HTML with inline styles for maximum email client compatibility.
 */

/**
 * Permission Slip logo block — centered at the top of the email.
 */
export function logoFragment(appUrl: string): string {
  return `<img src="${appUrl}/newsletter/permission-slip.png" alt="Permission Slip" style="display:block;margin:0 auto 24px;outline:none;border:none;text-decoration:none;" />`;
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
