import Wrap from "./wrap";
import styles from "./site-footer.module.css";

export default function SiteFooter() {
  return (
    <Wrap as="footer" className={styles.footer}>
      <span>
        <a href="mailto:shawn@livecorrectly.com">shawn@livecorrectly.com</a>
        &nbsp;&middot;&nbsp; Austin, TX
      </span>
    </Wrap>
  );
}
