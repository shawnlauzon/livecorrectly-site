import Wrap from './wrap';
import TrackedLink from './tracked-link';
import styles from './work-with-me-teaser.module.css';

/**
 * Closing paragraph of the homepage "Go further" band (it follows the guide
 * offer and shares its background), pointing to /work-with-me. A separate
 * component only so its section view is tracked on its own.
 */
export default function WorkWithMeTeaser() {
  return (
    <section className={styles.section}>
      <Wrap>
        <p className={styles.body}>
          <strong className={styles.lead}>Or work with me.</strong>{' '}
          Bring what you&rsquo;re wrestling with, and I&rsquo;ll tell you what
          your design says about it. One conversation, a deeper dive, the
          years ahead, or the person you keep clashing with.{' '}
          <TrackedLink
            className="link"
            href="/work-with-me"
            event="work_with_me_click"
            params={{ location: 'home_teaser' }}
          >
            See ways to work with me &rarr;
          </TrackedLink>
        </p>
      </Wrap>
    </section>
  );
}
