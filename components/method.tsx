import Wrap from "./wrap";
import styles from "./method.module.css";

export default function Method() {
  return (
    <section className={styles.section}>
      <Wrap>
        <p className={styles.eyebrow}>How we work</p>
        <h2 className={styles.h2}>
          I won&rsquo;t just tell you how you&rsquo;re built.{" "}
          <em className={styles.italic}>
            I&rsquo;ll work with you the way you&rsquo;re built.
          </em>
        </h2>
        <p className={styles.body}>
          Some people need to be asked questions. Some need to be left alone to
          arrive at it. Some need to talk it all the way through out loud before
          anything settles. Your chart tells me which&nbsp;&mdash; so the session
          itself fits you, not just what&rsquo;s in it.
        </p>
      </Wrap>
    </section>
  );
}
