"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { CONSENT_STORAGE_KEY } from "@/lib/consent";
import { SUBSCRIBER_COOKIE, rememberCookieString } from "@/lib/subscriber-cookie";

/**
 * Remembers the subscriber id from an email link (`?s=`) in a cookie so later
 * visits stay personalized. Skipped when the visitor declined cookies; the
 * banner's Decline also deletes it.
 */
export default function RememberSubscriber({ id }: { id: string }) {
  useEffect(() => {
    let consent: string | null = null;
    try {
      consent = localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
      // localStorage can throw when storage is blocked (privacy settings, some
      // embedded contexts). Normal for those visitors, so not logged: treat it
      // as "no choice made yet", same as a first visit.
    }
    if (consent === "denied") return;

    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${SUBSCRIBER_COOKIE}=`))
      ?.slice(SUBSCRIBER_COOKIE.length + 1);
    if (current === id) return;

    document.cookie = rememberCookieString(id, location.protocol === "https:");
    track("subscriber_remembered");
  }, [id]);

  return null;
}
