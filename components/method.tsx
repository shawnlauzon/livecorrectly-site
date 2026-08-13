import Wrap from './wrap';
import styles from './method.module.css';

export default function Method() {
  return (
    <section className={styles.section}>
      <Wrap>
        <p className={styles.eyebrow}>How I work</p>
        <h2 className={styles.h2}>
          I won&rsquo;t just tell you how you&rsquo;re built.{' '}
          <em className={styles.italic}>
            I&rsquo;ll work with you in a way that feels natural.
          </em>
        </h2>
        <p className={styles.body}>
          Some people need to be asked open-ended questions. For some, that can
          be overwhelming and a simple yes/no is best. And others need to hear
          themselves speak in order to get an answer. Your chart tells me which
          so the session itself fits you, not just what&rsquo;s in it.
        </p>
      </Wrap>
    </section>
  );
}
