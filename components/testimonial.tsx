import Wrap from "./wrap";
import styles from "./testimonial.module.css";

export default function Testimonial() {
  return (
    <section className={styles.section}>
      <Wrap>
        <p className="eyebrow">What it&rsquo;s like</p>
        <blockquote className={styles.quote}>
          <p className={styles.quoteText}>
            &ldquo;It made me feel seen, at a time when I&rsquo;d been
            questioning how I want to show up in my work. It felt like{" "}
            <em className={styles.highlight}>a permission slip</em>&nbsp;&mdash;
            not only to retreat, but to do things my way.&rdquo;
          </p>
          <cite className={styles.cite}>
            &mdash; A happy client
          </cite>
        </blockquote>
      </Wrap>
    </section>
  );
}
