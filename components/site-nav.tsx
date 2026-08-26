import Link from "next/link";
import Wrap from "./wrap";
import styles from "./site-nav.module.css";

export default function SiteNav({
  variant = "landing",
  backHref = "/",
  hideNewsletterLink = false,
}: {
  variant?: "landing" | "back";
  backHref?: string;
  hideNewsletterLink?: boolean;
}) {
  return (
    <Wrap as="header" className={styles.nav}>
      <Link className={styles.mark} href="/">
        Live <em className={styles.markAccent}>Correctly</em>
      </Link>
      <nav className={styles.links}>
        {!hideNewsletterLink && (
          <Link className={styles.link} href="/newsletter">
            Newsletter
          </Link>
        )}
        {variant === "landing" ? (
          <Link className={styles.quiet} href="/see-your-design">
            Do it your way
          </Link>
        ) : (
          <Link className={styles.back} href={backHref}>
            &larr; Back
          </Link>
        )}
      </nav>
    </Wrap>
  );
}
