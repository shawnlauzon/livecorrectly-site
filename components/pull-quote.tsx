import Wrap from "./wrap";
import styles from "./pull-quote.module.css";

export default function PullQuote() {
  return (
    <section className={styles.section}>
      <Wrap>
        <blockquote className={styles.quote}>
          <p className={styles.quoteText}>
            &ldquo;No matter what type of job I&rsquo;ve had, or what approach I
            try to bring into my work&nbsp;&mdash; most of the time, some kind of
            misalignment.&rdquo;
          </p>
          <cite className={styles.cite}>&mdash; a client, before we started</cite>
        </blockquote>
        <p className={styles.followUp}>
          If you&rsquo;ve changed the job, the format, the approach&nbsp;&mdash;
          and the same feeling followed you each time&nbsp;&mdash; the problem was
          never the circumstance.
        </p>
      </Wrap>
    </section>
  );
}
