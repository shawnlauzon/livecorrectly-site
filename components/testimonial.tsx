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
              &ldquo;It &lsquo;catalysed&rsquo; something real big&hellip;
              After our call, I&hellip;entered a pure state of flow&hellip;
              liberating some emotions and attachment and resistance inside me
              that I&rsquo;ve been working with for a very long time and
              started opening for me the access to some closure I&rsquo;d been
              seeking for just as long&hellip;{" "}
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
              &hellip;HD is a dynamic tool to gain insightful context for
              career alignment, and new perspective on strengths and struggles.
              I would highly recommend Shawn&rsquo;s services, and finding out
              how HD can help you maximize your efforts and play to your
              strengths.&rdquo;
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
