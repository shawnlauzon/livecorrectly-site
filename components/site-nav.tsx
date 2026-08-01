import Link from "next/link";
import Wrap from "./wrap";
import styles from "./site-nav.module.css";

export default function SiteNav({
  variant = "landing",
}: {
  variant?: "landing" | "back";
}) {
  return (
    <Wrap as="header" className={styles.nav}>
      <Link className={styles.mark} href="/">
        Live <em className={styles.markAccent}>Correctly</em>
      </Link>
      {variant === "landing" ? (
        <Link className={styles.quiet} href="/see-your-design">
          See how you&rsquo;re designed
        </Link>
      ) : (
        <Link className={styles.back} href="/">
          &larr; Back
        </Link>
      )}
    </Wrap>
  );
}
