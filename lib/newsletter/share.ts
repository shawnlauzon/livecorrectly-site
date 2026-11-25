import { EMAIL_COLORS } from '@/lib/email/colors';
import { PRODUCTION_URL } from '@/lib/site-url';

/**
 * Sharing an issue with someone who isn't a subscriber.
 *
 * A reader who forwards their own email passes on their personalized links
 * (including their unsubscribe link). The share link instead opens a new email
 * in the reader's mail app holding the issue's public web address — no
 * subscriber id — so the friend reads the web version and can get their own chart.
 */

/** Copy for the share line and the email it starts — the single place to edit it. */
export const SHARE_COPY = {
  /** Shown in the newsletter, before the link */
  line: "Know someone who'd enjoy this?",
  /** The link's words */
  link: 'Share this issue',
  /** Subject of the email the reader sends */
  emailSubject: 'Thought you might like this',
  /** First line of that email, above the issue link */
  emailBody: "I thought you'd like this issue of Permission Slip:",
};

/** The issue being shared: its web slug (null = not on the web) and number. */
export interface SharedIssue {
  slug: string | null;
  newsletterNumber: number;
}

/**
 * The public page a shared email points at: the issue's web page, or the
 * newsletter index when the issue isn't on the web. Tagged as a reader's
 * referral rather than one of our own email sends.
 */
function sharedPageUrl({ slug, newsletterNumber }: SharedIssue): string {
  const base = `${process.env.APP_URL ?? PRODUCTION_URL}/newsletter`;
  const utm = `utm_source=reader_share&utm_medium=referral&utm_campaign=newsletter_${newsletterNumber}`;
  return `${slug ? `${base}/${slug}` : base}?${utm}`;
}

/**
 * `mailto:` address that opens a new email, to nobody yet, with the share
 * subject and the issue link. HTML-escaped for use as an href attribute value.
 */
export function shareHref(issue: SharedIssue): string {
  const body = `${SHARE_COPY.emailBody}\n\n${sharedPageUrl(issue)}`;
  return `mailto:?subject=${encodeURIComponent(SHARE_COPY.emailSubject)}&amp;body=${encodeURIComponent(body)}`;
}

/**
 * Template variable for the share link, used as a link's address in the editor
 * so any words can share the issue. resolve.ts lists it in TEMPLATE_VARS so
 * Liquid and the broadcast converter leave it alone.
 */
export const SHARE_URL_VAR = 'share_url';

const SHARE_URL_RE = new RegExp(`\\{\\{\\s*${SHARE_URL_VAR}\\s*\\}\\}`, 'g');

/** Replace each `{{share_url}}` with the share link (see shareHref()). */
export function replaceShareUrl(html: string, issue: SharedIssue): string {
  const href = shareHref(issue);
  return html.replace(SHARE_URL_RE, () => href);
}

/**
 * The automatic share line for the email chrome, shown below the postscripts.
 * Empty when the issue has no web page to share.
 */
export function shareFragment(issue: SharedIssue): string {
  if (!issue.slug) return '';
  return (
    `<p data-newsletter-share style="margin:24px 0 0;font-size:16px;line-height:24px;color:${EMAIL_COLORS.inkSoft};">` +
    `${SHARE_COPY.line} ` +
    `<a href="${shareHref(issue)}" style="color:${EMAIL_COLORS.action};font-weight:600;text-decoration:underline;">${SHARE_COPY.link}</a>` +
    `</p>`
  );
}
