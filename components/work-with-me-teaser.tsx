import Wrap from './wrap';
import TrackedLink from './tracked-link';
import styles from './work-with-me-teaser.module.css';

/** Short homepage section under the guide, pointing to /work-with-me. */
export default function WorkWithMeTeaser() {
  return (
    <section className={styles.section}>
      <Wrap className={styles.inner}>
        <div>
          <p className="eyebrow">Work with me</p>
          <p className={styles.body}>
            Bring what you&rsquo;re wrestling with, and I&rsquo;ll tell you what
            your design says about it. One conversation, a deeper dive, the
            years ahead, or the person you keep clashing with.
          </p>
        </div>
        <TrackedLink
          className="link"
          href="/work-with-me"
          event="work_with_me_click"
          params={{ location: 'home_teaser' }}
        >
          See ways to work with me &rarr;
        </TrackedLink>
      </Wrap>
    </section>
  );
}
