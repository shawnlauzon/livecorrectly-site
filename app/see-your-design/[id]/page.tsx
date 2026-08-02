import { Suspense } from "react";
import Link from "next/link";
import ChartView from "@/components/chart-view";
import styles from "../page.module.css";

export default async function SeeYourDesignChart({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <header className={styles.wrap}>
        <nav
          style={{
            paddingTop: 28,
            paddingBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "var(--display)",
              fontWeight: 700,
              fontSize: "1.24rem",
              letterSpacing: "-0.02em",
              textDecoration: "none",
            }}
          >
            Live <span style={{ color: "var(--grape)" }}>Correctly</span>
          </Link>
          <Link
            href="/"
            style={{
              fontWeight: 500,
              fontSize: "0.92rem",
              textDecoration: "none",
              color: "var(--muted)",
            }}
          >
            &larr; Back
          </Link>
        </nav>
      </header>

      <main className={`${styles.wrap} ${styles.main}`}>
        <p className={styles.eyebrow}>Human Design</p>

        <Suspense fallback={<div>Loading&hellip;</div>}>
          <ChartView subscriberId={id} />
        </Suspense>
      </main>

      <footer className={`${styles.wrap} ${styles.footer}`}>
        shawn@livecorrectly.com &nbsp;&middot;&nbsp; Austin, TX
      </footer>
    </>
  );
}
