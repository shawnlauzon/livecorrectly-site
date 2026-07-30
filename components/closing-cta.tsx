import Link from "next/link";
import Wrap from "./wrap";
import styles from "./closing-cta.module.css";

export default function ClosingCta() {
  return (
    <section className={styles.close}>
      <Wrap>
        <Link className="btn" href="/see-your-design">
          See how you&rsquo;re designed
        </Link>
        <p className={styles.ctaNote}>
          Already have your chart, or want more depth?{" "}
          <a className="link" href={process.env.NEXT_PUBLIC_BOOKING_URL ?? "#book"} target="_blank" rel="noopener noreferrer">
            Book a conversation
          </a>
        </p>
      </Wrap>
    </section>
  );
}
