import Wrap from "./wrap";
import styles from "./team-link.module.css";

export default function TeamLink() {
  return (
    <section className={styles.teamlink}>
      <Wrap>
        <div className={styles.crosslink}>
          <p className={styles.crosslinkText}>Working together on a team?</p>
          <a className={styles.crosslinkBtn} href="https://workcorrectly.com">
            See more at Work Correctly &rarr;
          </a>
        </div>
      </Wrap>
    </section>
  );
}
