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

  // Replace default Resend fields: {{{FIRST_NAME|there}}}, {{{FIRST_NAME}}}, {{{RESEND_UNSUBSCRIBE_URL}}}
  result = result.replace(
    /\{\{\{(FIRST_NAME|LAST_NAME|EMAIL|RESEND_UNSUBSCRIBE_URL)(?:\|([^}]*))?\}\}\}/g,
    (_match, key: string, fallback: string | undefined) => {
      if (key in contactVars) return contactVars[key];
      if (fallback !== undefined) return fallback;
      return _match;
    },
  );

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
  const baseUrl = `${appUrl}/newsletter/${slug}?s=${subscriberId}&utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_${newsletterNumber}`;

  return html.replace(pattern, (_match, raw: string) => {
    const hashIndex = raw.indexOf('#');
    const buttonText = (hashIndex >= 0 ? raw.slice(0, hashIndex) : raw).trim();
    const anchor = hashIndex >= 0 ? raw.slice(hashIndex) : '';
    const url = `${baseUrl}${anchor}`;
    return `<div style="text-align:center;margin:24px 0"><a href="${url}" style="background-color:#158377;color:#FFFFFF;font-size:16px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">${buttonText}</a></div>`;
  });
}
