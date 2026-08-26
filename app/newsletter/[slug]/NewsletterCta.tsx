import Link from "next/link";
import styles from "./page.module.css";

export default function NewsletterCta() {
  return (
    <section className={styles.cta}>
      <h2>See how you&rsquo;re designed</h2>
      <p>
        Get your free Human Design chart and find out how your energy actually
        works.
      </p>
      <Link className="btn" href="/see-your-design">
        Get your free chart
      </Link>
    </section>
  );
}
