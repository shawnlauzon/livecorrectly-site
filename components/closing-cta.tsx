import Link from "next/link";
import Wrap from "./wrap";
import styles from "./closing-cta.module.css";

export default function ClosingCta() {
  return (
    <section className={styles.section}>
      <Wrap>
        <hr className="rule" />

        <div className={styles.cta}>
          <h2 className={styles.h2}>Start with your own chart.</h2>
          <Link className="btn" href="/see-your-design">
            See how you&rsquo;re designed
          </Link>
          <p className={styles.ctaSub}>
            Already have your chart, or want more depth?{" "}
            <a
              className="link"
              href="https://calendar.google.com/appointments/schedules/AcZssZ1kXUVAC-LNzJfVTRh5vOTKdXCDVuH1wAJvpXrgdjWLoq8XBGl5aYR3SJ1nTkN5pwwuuEnWzz8m"
              target="_blank"
              rel="noopener noreferrer"
            >
              Book a conversation
            </a>
          </p>
        </div>

        <hr className="rule" />

        <p className={styles.team}>
          Working together on a team?{" "}
          <a className={styles.teamLink} href="https://workcorrectly.com">
            See more at Work Correctly &rarr;
          </a>
        </p>
      </Wrap>
    </section>
  );
}
