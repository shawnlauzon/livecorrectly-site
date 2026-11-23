import Wrap from "./wrap";
import styles from "./testimonial.module.css";

export default function Testimonial() {
  return (
    <section className={styles.section}>
      <Wrap>
        <p className="eyebrow">What it&rsquo;s like</p>
        <div className={styles.grid}>
          <blockquote className={styles.quote}>
            <p className={styles.quoteText}>
              &ldquo;It &lsquo;catalysed&rsquo; something real big&hellip;{" "}
              <em className={styles.highlight}>
                You made a difference
              </em>
              .&rdquo;
            </p>
            <cite className={styles.cite}>&mdash; Sego, Life &amp; Health Coach</cite>
          </blockquote>
          <blockquote className={styles.quote}>
            <p className={styles.quoteText}>
              &ldquo;&hellip;he explained the aspects of what my results
              uncovered and answered all of my questions so I could get a{" "}
              <em className={styles.highlight}>practical understanding</em>.
              &hellip;I would highly recommend Shawn&rsquo;s
              services&hellip;&rdquo;
            </p>
            <cite className={styles.cite}>
              &mdash; Jessica, Director of Publicity &amp; Publishing
            </cite>
          </blockquote>
        </div>
      </Wrap>
    </section>
  );
}
