import Wrap from './wrap';
import styles from './pull-quote.module.css';

export default function PullQuote() {
  return (
    <section className={styles.section}>
      <Wrap>
        <p className="eyebrow">Before we started</p>
        <div className={styles.grid}>
          <blockquote className={styles.quote}>
            <p className={styles.quoteText}>
              &ldquo;&hellip;trying to align my value system and my work has
              been really hard&hellip; no matter what type of job I&rsquo;ve
              had, or what type of approach I try to bring into my
              work&nbsp;&mdash; most of the time, some kind of
              misalignment.&rdquo;
            </p>
          </blockquote>
          <blockquote className={styles.quote}>
            <p className={styles.quoteText}>
              &ldquo;All the guides and books that say you gotta, you gotta do
              this, you gotta show up. I don&rsquo;t have it in me to show
              up.&rdquo;
            </p>
          </blockquote>
        </div>
      </Wrap>
    </section>
  );
}
