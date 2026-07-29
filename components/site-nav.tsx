import Link from "next/link";
import Wrap from "./wrap";
import styles from "./site-nav.module.css";

export default function SiteNav({
  variant = "landing",
}: {
  variant?: "landing" | "back";
}) {
  return (
    <Wrap as="header" className={`${styles.nav} reveal d1`}>
      <Link className={styles.mark} href="/">
        Live <span className={styles.markAccent}>Correctly</span>
      </Link>
      {variant === "landing" ? (
        <Link className={styles.navCta} href="/see-your-design">
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
