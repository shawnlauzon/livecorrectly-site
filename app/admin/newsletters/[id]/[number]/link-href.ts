import { LIBRARY_URL_VAR } from '@/lib/newsletter/library-block';

const LIBRARY_URL_HREF_RE = new RegExp(`^\\{\\{\\s*${LIBRARY_URL_VAR}\\s*\\}\\}$`);

/**
 * Validate and normalize a link address typed into the editor's link selector.
 * Returns null to reject it — the selector then removes the link.
 *
 * `{{library_url}}` is accepted as-is; it's resolved per reader at send time
 * (replaceLibraryUrl()).
 */
export function validateLinkHref(value: string, isRelative: boolean): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // When "relative" is checked, accept any path
  if (isRelative) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
  if (LIBRARY_URL_HREF_RE.test(trimmed)) return `{{${LIBRARY_URL_VAR}}}`;
  // Standard absolute URL handling
  if (trimmed === '#') return '#';
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}
