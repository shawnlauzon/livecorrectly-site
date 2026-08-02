"use client";

import { useEffect, useState } from "react";
import ChartHero from "./chart-hero";
import styles from "./chart-form.module.css";
import { Subscriber } from "@/lib/types/subscriber";

interface ChartViewProps {
  subscriberId: string;
}

export default function ChartView({ subscriberId }: ChartViewProps) {
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchSubscriber() {
      try {
        const res = await fetch(`/api/subscribers/${subscriberId}`);
        if (res.status === 404 || res.status === 400) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error(`Unexpected status: ${res.status}`);
        }
        const data = (await res.json()) as Subscriber;
        setSubscriber(data);
      } catch (err) {
        console.error("Failed to load chart:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchSubscriber();
  }, [subscriberId]);

  if (loading) {
    return (
      <div className={styles.card}>
        <p style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
          Loading your chart&hellip;
        </p>
      </div>
    );
  }

  if (notFound || !subscriber) {
    return (
      <div className={styles.card}>
        <p style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
          Chart not found. The link may be incorrect.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <ChartHero subscriber={subscriber} />

      <p className={styles.emailP} style={{ marginTop: 28 }}>
        That&rsquo;s the data. If most of it doesn&rsquo;t mean anything to you yet,
        that&rsquo;s expected&nbsp;&mdash; it&rsquo;s a set of technical terms, not a reading.
      </p>
      <p className={styles.emailP}>
        I&rsquo;ve sent you an email with the part that&rsquo;s actually about you.
        Start there.
      </p>

      <div className={styles.emailBlock}>
        <h3 className={styles.emailH3}>
          Prefer to skip ahead?
        </h3>
        <p className={styles.emailP}>
          I&rsquo;ll walk you through it live.
        </p>
        <a
          className={styles.btn}
          href={process.env.NEXT_PUBLIC_BOOKING_URL ?? "#book"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Book a conversation
        </a>
      </div>
    </div>
  );
}
