"use client";

import Link from "next/link";
import Wrap from "./wrap";
import styles from "./closing-cta.module.css";
import { track } from "@/lib/analytics";

/** `chartHref` is set for returning subscribers (remembered id) — the CTA goes to their chart. */
export default function ClosingCta({ chartHref }: { chartHref?: string }) {
  return (
    <section className={styles.section}>
      <Wrap>
        <hr className="rule" />

        <div className={styles.cta}>
          <h2 className={styles.h2}>Start with your own chart.</h2>
          <Link className="btn" href={chartHref ?? "/see-your-design"}
            onClick={() => track(chartHref ? 'your_chart_click' : 'cta_click', { location: 'closing_cta' })}
          >
            See how you&rsquo;re designed
          </Link>
          <p className={styles.ctaSub}>
            Already have your chart, or want more depth?{" "}
            <a
              className="link"
              href={process.env.NEXT_PUBLIC_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('book_consultation_click', { location: 'closing_cta' })}
            >
              Book a conversation
            </a>
          </p>
        </div>

        <hr className="rule" />

        <p className={styles.team}>
          Working together on a team?{" "}
          <a className={styles.teamLink} href="https://workcorrectly.com"
            onClick={() => track('outbound_click', { destination: 'workcorrectly' })}
          >
            See more at Work Correctly &rarr;
          </a>
        </p>
      </Wrap>
    </section>
  );
}
