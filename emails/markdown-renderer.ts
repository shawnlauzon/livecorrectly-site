import { Marked, Renderer, type Tokens } from 'marked';
import type { EmailChartData } from '../lib/hd-chart/parse-for-email';

/**
 * Custom marked renderer that adds inline styles for email client compatibility.
 * Email clients strip <style> blocks and ignore CSS classes, so every element
 * needs inline styles.
 *
 * Marked v18 passes full token objects to renderer methods. Inline content
 * (paragraphs, headings, strong, em, etc.) must call this.parser.parseInline()
 * to render child tokens into HTML strings.
 */
export function createEmailRenderer(): Renderer {
  const renderer = new Renderer();

  renderer.paragraph = function ({ tokens }: Tokens.Paragraph): string {
    const text = this.parser.parseInline(tokens);
    return `<p style="margin:0 0 16px 0;font-size:16px;line-height:24px;color:#4A4A4A">${text}</p>\n`;
  };

  renderer.heading = function ({ tokens, depth }: Tokens.Heading): string {
    const text = this.parser.parseInline(tokens);
    if (depth === 2) {
      return `<h2 style="margin:24px 0 8px 0;font-size:20px;font-weight:bold;color:#221B3D">${text}</h2>\n`;
    }
    if (depth === 3) {
      return `<h3 style="margin:20px 0 8px 0;font-size:18px;font-weight:bold;color:#221B3D">${text}</h3>\n`;
    }
    return `<h${depth} style="margin:16px 0 8px 0;font-weight:bold;color:#221B3D">${text}</h${depth}>\n`;
  };

  renderer.link = function ({ href, tokens }: Tokens.Link): string {
    const text = this.parser.parseInline(tokens);
    return `<a href="${href}" style="color:#6A4BD6;text-decoration:underline">${text}</a>`;
  };

  renderer.list = function (token: Tokens.List): string {
    let body = '';
    for (const item of token.items) {
      body += this.listitem(item);
    }
    const tag = token.ordered ? 'ol' : 'ul';
    return `<${tag} style="margin:0 0 16px 0;padding-left:24px;font-size:16px;line-height:24px;color:#4A4A4A">${body}</${tag}>\n`;
  };

  renderer.listitem = function (item: Tokens.ListItem): string {
    const text = this.parser.parse(item.tokens);
    return `<li style="margin-bottom:8px">${text}</li>\n`;
  };

  renderer.hr = function (): string {
    return `<hr style="border:none;border-top:1px solid #E6E1F4;margin:24px 0" />\n`;
  };

  renderer.image = function ({ href, text }: Tokens.Image): string {
    return `<img src="${href}" alt="${text}" style="max-width:100%;height:auto;display:block;margin:16px 0;border-radius:8px" />\n`;
  };

  renderer.strong = function ({ tokens }: Tokens.Strong): string {
    const text = this.parser.parseInline(tokens);
    return `<strong style="font-weight:bold;color:#221B3D">${text}</strong>`;
  };

  renderer.em = function ({ tokens }: Tokens.Em): string {
    const text = this.parser.parseInline(tokens);
    return `<em>${text}</em>`;
  };

  renderer.blockquote = function ({ tokens }: Tokens.Blockquote): string {
    const text = this.parser.parse(tokens);
    return `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #6A4BD6;color:#4A4A4A;font-style:italic">${text}</blockquote>\n`;
  };

  return renderer;
}

/**
 * Shared Marked instance with inline email styles.
 * Reused by newsletter-loader.ts and broadcast-loader.ts.
 */
export const emailMarked = new Marked({ renderer: createEmailRenderer() });

/**
 * Replace {{variable}} placeholders in a string with values from a map.
 * Unused variables in the template are left as-is (harmless).
 */
export function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

/**
 * Replace Resend contact property syntax with actual values for preview/dry-run rendering.
 *
 * Handles patterns like:
 *   {{{contact.first_name|there}}}  → value from contactVars['first_name'], or fallback 'there'
 *   {{{contact.signup_month}}}      → value from contactVars['signup_month']
 *   {{{RESEND_UNSUBSCRIBE_URL}}}    → value from contactVars['RESEND_UNSUBSCRIBE_URL']
 *
 * Unknown contact vars are left as-is (they'd be replaced by Resend at send time).
 */
export function replaceResendContactVars(
  text: string,
  contactVars: Record<string, string>,
): string {
  // Replace {{{contact.KEY|fallback}}} and {{{contact.KEY}}}
  let result = text.replace(
    /\{\{\{contact\.([a-z_]+)(?:\|([^}]*))?\}\}\}/g,
    (_match, key: string, fallback: string | undefined) => {
      if (key in contactVars) return contactVars[key];
      if (fallback !== undefined) return fallback;
      return _match; // leave as-is if no value and no fallback
    },
  );

  // Replace {{{RESEND_UNSUBSCRIBE_URL}}}
  if ('RESEND_UNSUBSCRIBE_URL' in contactVars) {
    result = result.replaceAll(
      '{{{RESEND_UNSUBSCRIBE_URL}}}',
      contactVars['RESEND_UNSUBSCRIBE_URL'],
    );
  }

  return result;
}

/**
 * Replace {{chart:/subpath}} tokens with full subscriber chart URLs.
 *
 * Builds: {appUrl}/see-your-design/{subscriberId}{subpath}?utm_source=...
 *
 * Used inside standard markdown links:
 *   [See your lunar cycle]({{chart:/lunar-cycle}})
 *
 * If subscriberId is absent, the token is replaced with an empty string.
 */
export function replaceChartSubpaths(
  html: string,
  subscriberId: string | undefined,
  newsletterNumber: number,
): string {
  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
  return html.replace(
    /\{\{chart:(\/[^}]*)\}\}/g,
    (_match, subpath: string) => {
      if (!subscriberId) return '';
      return `${appUrl}/see-your-design/${subscriberId}${subpath}?utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_${newsletterNumber}`;
    },
  );
}

/**
 * Replace {{designed:Button text}} tokens in rendered HTML with styled CTA buttons
 * linking to the subscriber's personalized web version of the newsletter.
 *
 * The token appears inside a <p> tag after markdown rendering:
 *   <p style="...">{{designed:See what this means for you}}</p>
 *
 * Each match is replaced with a centered, inline-styled button.
 * If slug is null (email-only newsletter), the token is stripped with a warning.
 */
export function replaceDesignedCta(
  html: string,
  slug: string | null,
  subscriberId: string,
  newsletterNumber: number,
): string {
  const pattern = /<p[^>]*>\s*\{\{designed:(.+?)\}\}\s*<\/p>/g;

  if (!slug) {
    const stripped = html.replace(pattern, (_match, buttonText: string) => {
      console.warn(
        `[newsletter] Stripping {{designed:${buttonText}}} — newsletter ${newsletterNumber} has no slug`,
      );
      return '';
    });
    return stripped;
  }

  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
  const url = `${appUrl}/newsletter/${slug}?s=${subscriberId}&utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_${newsletterNumber}`;

  return html.replace(pattern, (_match, buttonText: string) => {
    return `<div style="text-align:center;margin:24px 0"><a href="${url}" style="background-color:#6A4BD6;color:#FFFFFF;font-size:16px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">${buttonText.trim()}</a></div>`;
  });
}

/**
 * Build a variable map from EmailChartData for use in markdown templates.
 * Iterates all string/number/boolean fields, prefixed with "chart.".
 * Skips arrays and objects (e.g. bridgeDescriptions) — those need React components.
 */
export function buildChartVariables(chart: EmailChartData): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(chart)) {
    if (typeof value === 'string') {
      vars[`chart.${key}`] = value;
    } else if (typeof value === 'number') {
      vars[`chart.${key}`] = String(value);
    } else if (typeof value === 'boolean') {
      vars[`chart.${key}`] = String(value);
    }
    // Skip arrays (bridgeDescriptions) and objects — need React for complex rendering
  }
  return vars;
}
