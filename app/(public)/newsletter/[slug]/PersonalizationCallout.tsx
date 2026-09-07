import Link from "next/link";
import styles from "./page.module.css";

export default function PersonalizationCallout() {
  return (
    <aside className={styles.callout}>
      <p>
        Subscribers receive this newsletter weekly, customized to their unique
        Human Design.
      </p>
      <p>
        <Link href="/see-your-design">Get your free chart</Link> to get yours.
      </p>
    </aside>
  );
}
