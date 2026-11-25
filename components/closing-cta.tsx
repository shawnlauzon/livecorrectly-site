"use client";

import Wrap from "./wrap";
import CtaPair from "./cta-pair";
import styles from "./closing-cta.module.css";
import { track } from "@/lib/analytics";

/** `subscriber` is set for returning subscribers (remembered id) — they get "Work with me", with the free 15-minute conversation as the small link. */
export default function ClosingCta({ subscriber = false }: { subscriber?: boolean }) {
  return (
    <section className={styles.section}>
      <Wrap>
        <hr className="rule" />

        <div className={styles.cta}>
          <h2 className={styles.h2}>
            {subscriber ? "Ready to go further?" : "Start with your own design."}
          </h2>
          <CtaPair subscriber={subscriber} location="closing_cta" subClassName={styles.ctaSub} />
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
