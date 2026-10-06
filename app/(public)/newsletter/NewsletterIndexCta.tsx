"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import ChartLinkRequest from "@/components/chart-link-request";
import styles from "./page.module.css";

interface NewsletterIndexCtaProps {
  /** Weekday the newsletter goes out (from the publication cadence), or null if unset */
  sendDay: string | null;
  /** Visitor is a known subscriber — show the cadence line only */
  subscribed: boolean;
}

export default function NewsletterIndexCta({ sendDay, subscribed }: NewsletterIndexCtaProps) {
  const cadence = `${sendDay ? `Sent every ${sendDay}` : "Sent weekly"}, personalized to your specific Human Design.`;

  if (subscribed) {
    return (
      <section className={styles.cta}>
        <p>{cadence}</p>
      </section>
    );
  }

  return (
    <aside className={styles.callout}>
      <p>
        {cadence}{" "}
        <Link
          href="/see-your-design"
          onClick={() => track("cta_click", { location: "newsletter_index" })}
        >
          Get your free chart
        </Link>{" "}
        to get yours.
      </p>
      {/* div, not p: ChartLinkRequest opens a <form>, which can't sit inside a <p> */}
      <div>
        <ChartLinkRequest location="newsletter_index" prompt="Already have one?" />
      </div>
    </aside>
  );
}
