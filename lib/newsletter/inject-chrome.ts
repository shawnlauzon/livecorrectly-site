/**
 * Inject email chrome (logo, signature, footer) into composeReactEmail() HTML output.
 *
 * composeReactEmail() produces a complete HTML document with this structure:
 *
 *   <html>
 *     <body>
 *       <table>                        ← outer wrapper
 *         <tr><td>                     ← font-family, font-size set here
 *           <table>                    ← max-width content table
 *             <tr>
 *               <td>                   ← innermost content cell
 *                 [editor content]
 *               </td>
 *             </tr>
 *           </table>
 *         </td></tr>
 *       </table>
 *     </body>
 *   </html>
 *
 * This module:
 * - Injects the logo right after <body> (above the table structure)
 * - Injects signature + postscripts + footer right before </body> (below the table structure)
 * - Fixes font-size:1em → font-size:16px so relative units resolve correctly
 */

import {
  logoFragment,
  preheaderFragment,
  noteFragment,
  signatureFragment,
  postscriptFragments,
  footerFragment,
} from './chrome-fragments';
import { libraryBlockFragment } from './library-block';
import { EMAIL_BODY_FONT, EMAIL_HEADING_FONT } from '../email/fonts';
import { EMAIL_COLORS } from '../email/colors';

export interface InjectChromeOptions {
  appUrl?: string;
  unsubscribeUrl: string;
  postscripts: string[];
  /** Hidden inbox preview text, injected first inside <body> */
  preheader?: string;
  /** Shared note shown between the logo and the issue body */
  note?: string;
  /** Personalizes the newsletter library block shown after the note; omitted → no block */
  library?: { subscriberId: string; newsletterNumber: number };
}

/** An <img>, optionally inside the <a> the editor wraps linked images in. */
const IMAGE = String.raw`<img\b[^>]*>\s*(?:<\/a>\s*)?`;
/** A paragraph holding nothing but one <em> — a caption when it follows an image. */
const CAPTION_RE = new RegExp(
  String.raw`(${IMAGE})<p\b([^>]*?)style="([^"]*)"(?=>\s*<em>(?:(?!<\/?em\b|<\/p>)[\s\S])*<\/em>\s*<\/p>)`,
  'gi',
);

/** A `color:` declaration on its own — not border-color, background-color, etc. */
const COLOR_DECL = String.raw`(?<![-\w])color:`;

/**
 * Style the issue body. Runs on the body alone, before chrome (which has its
 * own logo image and colors) is added:
 * - More room above each image, and below an italic caption that follows one,
 *   so image + caption read as a unit.
 * - Brand text colors: the editor theme writes black body text (saved issues
 *   keep it), which becomes ink-soft; headings without their own color get ink.
 * - Heading font: issues saved under an older editor theme name a web font in
 *   their headings; every email heading is the email heading font.
 */
function styleIssueBody(html: string): string {
  return html
    // &#x27; (the editor's escaped quote) contains a ';', so match it explicitly.
    .replace(
      /(<h[1-3]\b[^>]*?style="[^"]*?)font-family:(?:&#x27;|[^;"])*/gi,
      `$1font-family:${EMAIL_HEADING_FONT}`,
    )
    .replace(/<img\b([^>]*?)style="/gi, '<img$1style="margin-top:32px;')
    .replace(CAPTION_RE, '$1<p$2style="$3;margin-bottom:24px"')
    .replace(new RegExp(`${COLOR_DECL}\\s*#000000\\b`, 'gi'), `color:${EMAIL_COLORS.inkSoft}`)
    .replace(
      new RegExp(`<(h[1-3])\\b([^>]*?)style="(?![^"]*${COLOR_DECL})`, 'gi'),
      `<$1$2style="color:${EMAIL_COLORS.ink};`,
    );
}

/**
 * Inject email chrome into composeReactEmail() HTML output.
 *
 * Injects the hidden preheader, logo, optional note and optional library block
 * after <body> and the suffix (signature, postscripts, footer) before </body>,
 * so chrome sits outside the table structure.
 *
 * Also normalizes font-size:1em → font-size:16px on the outer content <td>
 * so that the editor's relative em units resolve to a readable base size.
 */
export function injectEmailChrome(
  html: string,
  options: InjectChromeOptions,
): string {
  const appUrl = options.appUrl ?? process.env.APP_URL ?? 'https://www.livecorrectly.com';

  // Build fragment strings
  const prefix = [
    logoFragment(appUrl),
    noteFragment(options.note ?? ''),
    options.library
      ? libraryBlockFragment(options.library.subscriberId, options.library.newsletterNumber)
      : '',
  ].filter(Boolean).join('\n');
  const signature = signatureFragment(appUrl);
  const ps = postscriptFragments(options.postscripts);
  const footer = footerFragment(options.unsubscribeUrl);

  // Assemble the suffix: signature, then postscripts (if any), then footer.
  // Wrap in a centered max-width table to match the content area width.
  const suffixContent = [signature, ps, footer].filter(Boolean).join('\n');
  const suffix = `<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;"><tr><td style="font-family:${EMAIL_BODY_FONT};font-size:16px;">${suffixContent}</td></tr></table>`;

  // The frame (matches the welcome emails' EmailLayout): ground-colored page,
  // everything but the hidden preheader on one white 660px column.
  const frameOpen =
    `<table data-newsletter-frame width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${EMAIL_COLORS.ground}"><tr><td>` +
    `<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:660px;margin:0 auto;background-color:${EMAIL_COLORS.card}"><tr><td style="padding:32px 24px">`;
  const frameClose = `</td></tr></table></td></tr></table>`;

  // Inject the preheader and frame (logo, note, library) right after <body...>, and suffix + frame
  // close right before </body>. Chrome sits outside the editor's table structure for correct ordering.
  const bodyOpenPattern = /<body\b[^>]*>/i;
  const bodyMatch = bodyOpenPattern.exec(html);
  if (!bodyMatch) {
    console.warn('[inject-chrome] Could not find <body> tag in composeReactEmail output');
    return html;
  }

  const bodyCloseIndex = html.indexOf('</body>');
  if (bodyCloseIndex === -1) {
    console.warn('[inject-chrome] Could not find </body> tag in composeReactEmail output');
    return html;
  }

  const bodyInsertPos = bodyMatch.index + bodyMatch[0].length;
  // The editor paints <body> white; the page around the column is ground.
  const bodyTag = bodyMatch[0]
    .replace(/\s+style="[^"]*"/i, '')
    .replace(/\s*\/?>$/, ` style="background-color:${EMAIL_COLORS.ground}">`);

  let result =
    html.slice(0, bodyMatch.index) + bodyTag +
    '\n' + preheaderFragment(options.preheader ?? '') + frameOpen + '\n' + prefix + '\n' +
    styleIssueBody(html.slice(bodyInsertPos, bodyCloseIndex)) +
    '\n' + suffix + frameClose + '\n' +
    html.slice(bodyCloseIndex);

  // Set the issue body in the brand body font. The editor's theme writes its
  // own font-family next to font-size:1em on the outer content <td>, and saved
  // issues keep whatever font was current when they were saved. Lazy and
  // quote-bounded rather than [^;]: the editor escapes quotes as &#x27;.
  result = result.replace(
    /font-family:[^"]*?(;\s*font-size:\s*1em)/,
    `font-family:${EMAIL_BODY_FONT}$1`,
  );

  // Fix font-size: 1em → 16px on the outer content <td> so relative em units
  // in the editor content resolve to a readable base size.
  result = result.replace(
    /font-size:\s*1em/,
    'font-size:16px',
  );

  // Add font-family to h1-h3 headings that don't already have it.
  // Covers newsletters saved before the extendTheme fix was added.
  result = result.replace(
    /<(h[1-3])\b([^>]*?)style="(?![^"]*font-family)([^"]*)"/gi,
    `<$1$2style="font-family:${EMAIL_HEADING_FONT};$3"`,
  );

  // Tighten list spacing: override the basic theme defaults (1em after lists,
  // 0.3em top+bottom on list items) for a more compact layout.
  result = result.replaceAll(
    /(<li\b[^>]*style="[^"]*?)padding-top:\s*0\.3em/gi,
    '$1padding-top:0.1em',
  );
  result = result.replaceAll(
    /(<li\b[^>]*style="[^"]*?)padding-bottom:\s*0\.3em/gi,
    '$1padding-bottom:0.1em',
  );
  result = result.replaceAll(
    /(<[uo]l\b[^>]*style="[^"]*?)padding-bottom:\s*1em/gi,
    '$1margin-top:-0.5em;padding-bottom:0.25em',
  );

  return result;
}
