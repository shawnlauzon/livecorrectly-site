"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import styles from "./page.module.css";

interface NewsletterIndexCtaProps {
  /** Weekday the newsletter goes out (from the publication cadence), or null if unset */
  sendDay: string | null;
  /** Visitor is a known subscriber — show the cadence line but not the subscribe button */
  subscribed: boolean;
}

export default function NewsletterIndexCta({ sendDay, subscribed }: NewsletterIndexCtaProps) {
  return (
    <section className={styles.cta}>
      <p>
        {sendDay ? `Sent every ${sendDay}` : "Sent weekly"}, personalized to
        your specific Human Design.
      </p>
      {!subscribed && (
        <Link
          className="btn"
          href="/see-your-design"
          onClick={() => track("cta_click", { location: "newsletter_index" })}
        >
          Subscribe for free
        </Link>
      )}
    </section>
  );
}
