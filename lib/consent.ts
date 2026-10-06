/**
 * localStorage key holding the visitor's cookie choice: 'granted' | 'denied'
 * (absent until they choose). Read by the cookie banner, the GA4 consent
 * scripts and anything that sets a non-essential cookie.
 */
export const CONSENT_STORAGE_KEY = 'cookie-consent';
