"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import styles from "./cookie-banner.module.css";

const STORAGE_KEY = "cookie-consent";

function subscribeNoop() {
  // localStorage doesn't fire events on same-window writes;
  // the banner only needs the value on mount, so this is a no-op.
  return () => {};
}

function getConsentSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  // During SSR, assume consent hasn't been given yet (return null to hide
  // the banner server-side, then hydrate with the real value on the client).
  return "pending";
}

export default function CookieBanner() {
  const consent = useSyncExternalStore(subscribeNoop, getConsentSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  const visible = consent === null && !dismissed;

  function accept() {
    localStorage.setItem(STORAGE_KEY, "granted");
    setDismissed(true);

    // Update Google Consent Mode to allow analytics
    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag === "function") {
      w.gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "denied");
    setDismissed(true);
  }

  if (!visible) return null;

  return (
    <div className={styles.banner} role="banner" aria-label="Cookie consent">
      <p className={styles.text}>
        We use cookies for analytics to understand how visitors use this site.{" "}
        <Link href="/privacy">Learn more</Link>
      </p>
      <div className={styles.buttons}>
        <button className={styles.accept} onClick={accept}>
          Accept
        </button>
        <button className={styles.decline} onClick={decline}>
          Decline
        </button>
      </div>
    </div>
  );
}
