/**
 * Shared utilities for computing Jovian Archive bodygraph image URLs.
 *
 * The timeId formula converts a JS epoch-ms timestamp into the .NET tick
 * format that the JA RaveChartGenerator expects.
 */

/** Convert a UTC birth-time ISO string to the JA "Time" parameter. */
export function computeTimeId(birthTimeUtc: string): number {
  const ms = new Date(birthTimeUtc).getTime();
  return 1e4 * ms + 621355968e9;
}

/**
 * Return the URL to use for a bodygraph chart image.
 * Points at our caching proxy (`/api/chart-image`), which lazily fetches
 * from the JA CDN on the first request and stores the result in Vercel Blob.
 */
export function getChartImageUrl(birthTimeUtc: string): string {
  const timeId = computeTimeId(birthTimeUtc);
  return `/api/chart-image?timeId=${timeId}`;
}
