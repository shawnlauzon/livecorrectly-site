import Link from "next/link";
import Wrap from "./wrap";
import styles from "./hero.module.css";

export default function Hero() {
  return (
    <main className={styles.hero}>
      <div className={styles.aura} aria-hidden="true" />
      <Wrap className={styles.heroInner}>
        <p className={`${styles.eyebrow} reveal d1`}>
          Human Design for solopreneurs
        </p>
        <h1 className={`${styles.h1} reveal d2`}>
          A business designed
          <br />
          around <span className={styles.swipe}>you</span>.
        </h1>
        <p className={`${styles.sub} reveal d3`}>
          Stop listening to coaches who tell you how they&rsquo;d run it. Yours
          should work the way you do. We help you understand how.
        </p>
        <div className={`${styles.ctaRow} reveal d4`}>
          <Link className="btn" href="/see-your-design">
            See how you&rsquo;re designed
          </Link>
        </div>
        <p className={`${styles.ctaNote} reveal d4`}>
          Already have your chart, or want more depth?{" "}
          <a className="link" href={process.env.NEXT_PUBLIC_BOOKING_URL ?? "#book"} target="_blank" rel="noopener noreferrer">
            Book a conversation
          </a>
        </p>
      </Wrap>
    </main>
  );
}
