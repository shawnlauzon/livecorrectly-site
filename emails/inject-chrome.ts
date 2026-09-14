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
 * This module finds the innermost content <td> and:
 * - Prepends the logo after the opening <td> tag
 * - Appends signature + postscripts + footer before the closing </td> tag
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
 * Finds the innermost content <td> (inside the nested table structure) and
 * injects logo, signature, postscripts, and footer at the right positions.
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

  // Assemble the suffix: signature, then postscripts (if any), then footer
  const suffix = [signature, ps, footer].filter(Boolean).join('\n');

  // Strategy: find the innermost <td> that contains the actual editor content.
  //
  // The composeReactEmail output has exactly two nested tables:
  // 1. Outer table > tr > td (sets font-family/size on the whole email)
  // 2. Inner table (max-width:600px) > tr > td (contains actual content)
  //
  // We find the inner table's <td> by looking for the second <td in the body,
  // which is the one inside the max-width content table.

  // Find all <td ...> opening tags and their positions
  const tdOpenPattern = /<td\b[^>]*>/gi;
  const tdMatches: { index: number; length: number; match: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = tdOpenPattern.exec(html)) !== null) {
    tdMatches.push({ index: m.index, length: m[0].length, match: m[0] });
  }

  if (tdMatches.length < 2) {
    // Fallback: can't find expected structure, return html as-is
    console.warn('[inject-chrome] Could not find expected <td> structure in composeReactEmail output');
    return html;
  }

  // The innermost content cell is the last <td> in the document
  const innerTd = tdMatches[tdMatches.length - 1];

  // Find the matching </td> for this innermost <td>
  // Since it's the innermost, its </td> is the first one after it
  const closingTdIndex = html.indexOf('</td>', innerTd.index + innerTd.length);
  if (closingTdIndex === -1) {
    console.warn('[inject-chrome] Could not find closing </td> for innermost content cell');
    return html;
  }

  // Inject logo after the opening <td> tag, and suffix before the closing </td>
  let result =
    html.slice(0, innerTd.index + innerTd.length) +
    '\n' + logo + '\n' +
    html.slice(innerTd.index + innerTd.length, closingTdIndex) +
    '\n' + suffix + '\n' +
    html.slice(closingTdIndex);

  // Fix font-size: 1em → 16px on the outer content <td> so relative em units
  // in the editor content resolve to a readable base size.
  // The outer <td> is the first one (tdMatches[0]).
  result = result.replace(
    /font-size:\s*1em/,
    'font-size:16px',
  );

  return result;
}
