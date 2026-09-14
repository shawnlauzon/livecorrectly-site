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
  signatureFragment,
  postscriptFragments,
  footerFragment,
} from './chrome-fragments';

export interface InjectChromeOptions {
  appUrl?: string;
  unsubscribeUrl: string;
  postscripts: string[];
}

/**
 * Inject email chrome into composeReactEmail() HTML output.
 *
 * Injects logo after <body> and suffix (signature, postscripts, footer) before
 * </body>, so chrome sits outside the table structure.
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
  const logo = logoFragment(appUrl);
  const signature = signatureFragment(appUrl);
  const ps = postscriptFragments(options.postscripts);
  const footer = footerFragment(options.unsubscribeUrl);

  // Assemble the suffix: signature, then postscripts (if any), then footer.
  // Wrap in a centered max-width table to match the content area width.
  const suffixContent = [signature, ps, footer].filter(Boolean).join('\n');
  const suffix = `<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;"><tr><td style="font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif;font-size:16px;">${suffixContent}</td></tr></table>`;

  // Inject logo right after <body...> and suffix right before </body>.
  // Both sit outside the table structure for correct ordering.
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

  let result =
    html.slice(0, bodyInsertPos) +
    '\n' + logo + '\n' +
    html.slice(bodyInsertPos, bodyCloseIndex) +
    '\n' + suffix + '\n' +
    html.slice(bodyCloseIndex);

  // Fix font-size: 1em → 16px on the outer content <td> so relative em units
  // in the editor content resolve to a readable base size.
  result = result.replace(
    /font-size:\s*1em/,
    'font-size:16px',
  );

  return result;
}
