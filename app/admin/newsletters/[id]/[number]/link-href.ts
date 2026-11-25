import { LIBRARY_URL_VAR } from '@/lib/newsletter/library-block';
import { SHARE_URL_VAR } from '@/lib/newsletter/share';

/** Link variables accepted as a whole address; each is resolved at send time. */
const LINK_VARS = [LIBRARY_URL_VAR, SHARE_URL_VAR];
const LINK_VAR_HREF_RE = new RegExp(`^\\{\\{\\s*(${LINK_VARS.join('|')})\\s*\\}\\}$`);

/**
 * Validate and normalize a link address typed into the editor's link selector.
 * Returns null to reject it — the selector then removes the link.
 *
 * `{{library_url}}` and `{{share_url}}` are accepted as-is; they're resolved at
 * send time (replaceLibraryUrl(), replaceShareUrl()).
 */
export function validateLinkHref(value: string, isRelative: boolean): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // When "relative" is checked, accept any path
  if (isRelative) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
  const linkVar = LINK_VAR_HREF_RE.exec(trimmed);
  if (linkVar) return `{{${linkVar[1]}}}`;
  // Standard absolute URL handling
  if (trimmed === '#') return '#';
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}
