/**
 * True the first time `key` is seen in this browser session, false after.
 * For firing a GA4 event once per purchase however often the page reloads.
 */
export function firstTimeThisSession(key: string): boolean {
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // Storage unavailable: carry on, GA4 dedupes on transaction_id and the server on the subscriber.
  }
  return true;
}
