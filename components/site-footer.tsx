import Link from "next/link";
import Wrap from "./wrap";
import styles from "./site-footer.module.css";

export default function SiteFooter() {
  return (
    <Wrap as="footer" className={styles.footer}>
      <a className={styles.footerLink} href="mailto:shawn@livecorrectly.com">
        shawn@livecorrectly.com
      </a>
      <span className={styles.sep}>&middot;</span>
      <span>Austin, TX</span>
      <span className={styles.sep}>&middot;</span>
      <Link className={styles.footerLink} href="/privacy">
        Privacy
      </Link>
    </Wrap>
  );
}
