import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ChartView from "@/components/chart-view";
import { getSubscriberById } from "@/lib/db";
import { careerDesigns } from "@/lib/hd-chart/constants";
import styles from "../page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const subscriber = await getSubscriberById(id);
  if (!subscriber) return {};

  const name = subscriber.last_name
    ? `${subscriber.first_name} ${subscriber.last_name}`
    : subscriber.first_name;
  const typeName =
    careerDesigns[subscriber.chart.chart.type] ?? "Human Design";
  const title = `Design for ${name}`;
  const description = `${subscriber.first_name} is a ${typeName}. See their Human Design chart.`;

  return {
    title: `${title} — Live Correctly`,
    description,
    openGraph: { type: "profile", title, description },
    twitter: { card: "summary", title, description },
  };
}

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
