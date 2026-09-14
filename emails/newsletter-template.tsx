import { loadNewsletterIssue } from '@/newsletters/loader';
import { hasLiquidConditionals, hasLiquidOutputTags } from '@/newsletters/resolve';
import { injectEmailChrome } from './inject-chrome';

interface RenderNewsletterEmailOptions {
  bodyHtml: string;
  unsubscribeUrl: string;
  ps: string[];
}

/**
 * Whether a newsletter requires per-subscriber rendering.
 * True if the newsletter has Liquid conditional blocks in the HTML.
 *
 * Used by the cron to decide between transactional (per-subscriber) and
 * Resend Broadcast API (single API call) sending paths.
 */
export async function requiresPerSubscriberRendering(number: number): Promise<boolean> {
  const raw = await loadNewsletterIssue(number);
  if (!raw) return false;
  if (hasLiquidConditionals(raw.bodyHtml)) return true;
  if (hasLiquidOutputTags(raw.bodyHtml)) return true;

  return false;
}

/**
 * Render a newsletter email by injecting chrome (logo, signature, footer)
 * into the composeReactEmail() HTML output.
 *
 * The bodyHtml from composeReactEmail() is already a complete HTML document.
 * This function injects shared email chrome directly into that document,
 * avoiding the double-nested <html> problem that occurred when wrapping
 * bodyHtml inside EmailLayout (another complete HTML document).
 *
 * Returns a ready-to-send HTML string.
 */
/**
 * Replace raw Vercel Blob URLs with proxied URLs through the sending domain.
 * Gmail and other providers flag emails where image hosts don't match the
 * sender domain — this rewrites them to go through www.livecorrectly.com/i/.
 */
function rewriteBlobUrls(html: string): string {
  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
  return html.replace(
    /https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//g,
    `${appUrl}/i/`,
  );
}

export function renderNewsletterEmail({
  bodyHtml,
  unsubscribeUrl,
  ps,
}: RenderNewsletterEmailOptions): string {
  return injectEmailChrome(rewriteBlobUrls(bodyHtml), {
    unsubscribeUrl,
    postscripts: ps,
  });
}
