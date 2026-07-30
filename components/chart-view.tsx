"use client";

import { useEffect, useState } from "react";
import BodygraphPlaceholder from "./bodygraph-placeholder";
import ChartReadout from "./chart-readout";
import ChartImage from "./admin/chart-image";
import styles from "./chart-form.module.css";
import { Subscriber } from "@/lib/types/subscriber";
import hdChart from "@/lib/hd-chart";

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

  const chartRecord = subscriber.chart;
  const hd = hdChart(chartRecord.chart);
  const birthTimeUtc = chartRecord?.meta?.birthData?.time?.utc ?? null;
  const showBodygraph = !!birthTimeUtc && !subscriber.time_unknown;

  return (
    <div className={styles.card}>
      <div className={styles.resultHead}>
        <div className={styles.bodygraph}>
          {showBodygraph ? (
            <ChartImage birthTimeUtc={birthTimeUtc} />
          ) : (
            <BodygraphPlaceholder />
          )}
        </div>
        <div>
          <p className={styles.typeLabel}>Your type</p>
          <h2 className={styles.typeName}>{hd.type()}</h2>
        </div>
      </div>

      <ChartReadout
        chart={chartRecord.chart}
        classes={{
          readout: styles.readout,
          rowitem: styles.rowitem,
          k: styles.k,
          v: styles.v,
        }}
      />

      <div className={styles.emailBlock}>
        <h3 className={styles.emailH3}>
          In a hurry? Have questions right now?
        </h3>
        <p className={styles.emailP}>
          Book a free 30-minute conversation and I&rsquo;ll walk you through
          your chart live.
        </p>
        <a
          className={styles.btn}
          href="https://calendar.google.com/appointments/schedules/AcZssZ1kXUVAC-LNzJfVTRh5vOTKdXCDVuH1wAJvpXrgdjWLoq8XBGl5aYR3SJ1nTkN5pwwuuEnWzz8m"
          target="_blank"
          rel="noopener noreferrer"
        >
          Book a conversation
        </a>
      </div>
    </div>
  );
}
