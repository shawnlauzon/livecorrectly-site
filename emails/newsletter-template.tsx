import { loadNewsletter } from '@/newsletters/loader';
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
 * broadcast (single API call) sending paths.
 */
export async function requiresPerSubscriberRendering(number: number): Promise<boolean> {
  const raw = await loadNewsletter(number);
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
export function renderNewsletterEmail({
  bodyHtml,
  unsubscribeUrl,
  ps,
}: RenderNewsletterEmailOptions): string {
  return injectEmailChrome(bodyHtml, {
    unsubscribeUrl,
    postscripts: ps,
  });
}
