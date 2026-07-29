import Wrap from "./wrap";
import styles from "./how-it-helps.module.css";

const reasons = [
  {
    label: "Decisions",
    text: "Make your own calls with confidence — without depending on others for advice.",
  },
  {
    label: "Marketing",
    text: "Bring in the right clients without selling like someone you\u2019re not.",
  },
  {
    label: "Profit",
    text: "Make your money from the work that actually energizes you.",
  },
];

export default function HowItHelps() {
  return (
    <section className={styles.help} id="more">
      <Wrap>
        <div className={styles.sectionHead}>
          <p className={styles.eyebrow}>How it helps</p>
          <h2 className={styles.h2}>What changes for you</h2>
        </div>
        <div>
          {reasons.map((r) => (
            <div className={styles.reason} key={r.label}>
              <span className={styles.label}>
                <span className={styles.dot} aria-hidden="true" />
                {r.label}
              </span>
              <h3 className={styles.h3}>{r.text}</h3>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
