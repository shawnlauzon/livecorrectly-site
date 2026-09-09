"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import styles from "./page.module.css";

export default function NewsletterIndexCta() {
  return (
    <section className={styles.cta}>
      <p>
        Sent every Wednesday, personalized to your specific Human Design.
      </p>
      <Link
        className="btn"
        href="/see-your-design"
        onClick={() => track("cta_click", { location: "newsletter_index" })}
      >
        Subscribe for free
      </Link>
    </section>
  );
}
