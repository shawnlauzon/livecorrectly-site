import Wrap from './wrap';
import styles from './how-it-helps.module.css';

const reasons = [
  {
    tag: 'Decisions',
    text: 'Make your own calls with confidence, without depending on others for advice.',
  },
  {
    tag: 'Visibility',
    text: 'Bring in the right people without selling like someone you\u2019re not.',
  },
  {
    tag: 'Relationships',
    text: 'Understand why certain people are hard to reach, and what to do differently.',
  },
];

export default function HowItHelps() {
  return (
    <section className={styles.section}>
      <Wrap>
        <div className={styles.head}>
          <p className="eyebrow">How it helps</p>
          <h2 className={styles.h2}>What changes for you</h2>
        </div>
        <div className={styles.columns}>
          {reasons.map((r) => (
            <div className={styles.col} key={r.tag}>
              <span className={styles.tag}>{r.tag}</span>
              <h3 className={styles.h3}>{r.text}</h3>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
