import { PRODUCTION_URL } from "@/lib/site-url";

/**
 * Block token for the "newsletter library" callout.
 *
 * It's a block, not an inline variable, so it deliberately avoids `{{ }}`:
 * Liquid would render an unknown `{{ var }}` as empty, and the broadcast
 * converter would turn it into a `{{{contact.var}}}` placeholder. Neither
 * touches `[[ ]]`, so the token survives until replaceLibraryBlock() swaps the
 * whole paragraph for the block (a table can't live inside a <p>).
 */
export const LIBRARY_BLOCK_TOKEN = "[[newsletter-library]]";

/** Copy for the block — the single place to edit it. */
export const LIBRARY_BLOCK_COPY = {
  heading: "Your newsletter library",
  body: "Every issue is on the site, written for your unique design. Catch up on those you missed, go back to one worth rereading, or even skip ahead to one which you'll receive in future weeks!",
  button: "See them all →",
};

// Brand tokens (see CLAUDE.md design system); email needs inline hex values.
const INK = "#221B3D";
const GRAPE = "#6A4BD6";
const MARIGOLD = "#FFB020";
const MARIGOLD_TINT = "#FFF4DB";

/** Paragraph (any attributes/whitespace, as the editor writes it) holding only the token. */
const TOKEN_PARAGRAPH_RE =
  /<p\b[^>]*>\s*\[\[newsletter-library\]\]\s*<\/p\s*>/g;

function libraryBlockHtml(
  subscriberId: string,
  newsletterNumber: number,
): string {
  const appUrl = process.env.APP_URL ?? PRODUCTION_URL;
  const url = `${appUrl}/newsletter?s=${subscriberId}&utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_${newsletterNumber}`;
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border-collapse:separate">` +
    `<tr><td style="background-color:${MARIGOLD_TINT};border-left:4px solid ${MARIGOLD};border-radius:8px;padding:20px 24px">` +
    `<p style="margin:0 0 8px;font-family:'Bricolage Grotesque',Arial,sans-serif;font-size:20px;font-weight:700;line-height:1.3;color:${INK}">${LIBRARY_BLOCK_COPY.heading}</p>` +
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${INK}">${LIBRARY_BLOCK_COPY.body}</p>` +
    `<a href="${url}" style="background-color:${GRAPE};color:#FFFFFF;font-size:16px;font-weight:600;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block">${LIBRARY_BLOCK_COPY.button}</a>` +
    `</td></tr></table>`
  );
}

/**
 * Replace each `[[newsletter-library]]` paragraph with the library block.
 *
 * In web mode (the reader is already on the site) or without a subscriber id
 * (nothing to personalize the link with), the paragraph is removed instead.
 * `subscriberId` may be a Resend placeholder like `{{{contact.neon_id}}}`.
 */
export function replaceLibraryBlock(
  html: string,
  subscriberId: string | undefined,
  newsletterNumber: number,
  mode: "web" | "email",
): string {
  if (mode === "web" || !subscriberId)
    return html.replace(TOKEN_PARAGRAPH_RE, "");
  return html.replace(TOKEN_PARAGRAPH_RE, () =>
    libraryBlockHtml(subscriberId, newsletterNumber),
  );
}
