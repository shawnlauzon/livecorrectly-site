/**
 * Format the raw `unsub_from` database value into a human-readable email name.
 * e.g. "welcome0" → "Welcome 0", "newsletter_5" → "Newsletter #5"
 */
export function formatUnsubFrom(raw: string | null): string {
  if (!raw) return 'N/A';
  // welcome0 → "Welcome 0", welcome_series_1 → "Welcome series 1"
  if (/^welcome\d+$/i.test(raw)) return `Welcome ${raw.replace(/\D/g, '')}`;
  // newsletter_5 → "Newsletter #5"
  if (/^newsletter[_-]?\d+$/i.test(raw)) return `Newsletter #${raw.replace(/\D/g, '')}`;
  // General: replace underscores/hyphens with spaces, title-case first word
  const cleaned = raw.replace(/[_-]/g, ' ').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
