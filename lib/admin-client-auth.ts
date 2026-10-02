/**
 * Client-side storage for the admin password, sent as `Authorization: Bearer`
 * on admin API calls.
 *
 * localStorage (not sessionStorage) so one sign-in covers every tab and survives
 * a browser restart. Cleared on any 401 so a changed password prompts again.
 */
const KEY = 'adminPassword';

export function getAdminPassword(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY);
}

export function setAdminPassword(password: string): void {
  localStorage.setItem(KEY, password);
}

export function clearAdminPassword(): void {
  localStorage.removeItem(KEY);
}
