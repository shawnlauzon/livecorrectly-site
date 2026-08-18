"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./cookie-banner.module.css";

const STORAGE_KEY = "cookie-consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "granted");
    setVisible(false);

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
    setVisible(false);
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
