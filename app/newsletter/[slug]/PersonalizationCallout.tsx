import Link from "next/link";
import styles from "./page.module.css";

export default function PersonalizationCallout({ note }: { note: string }) {
  return (
    <aside className={styles.callout}>
      <p>{note}</p>
      <p>
        <Link href="/see-your-design">Get your free chart</Link> to see yours.
      </p>
    </aside>
  );
}
