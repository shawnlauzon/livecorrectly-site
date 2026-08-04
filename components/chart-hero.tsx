"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import ChartImage from "./admin/chart-image";
import ChartReadout from "./chart-readout";
import hdChart from "@/lib/hd-chart";
import { careerDesignSubtitles } from "@/lib/hd-chart/constants";
import { Subscriber } from "@/lib/types/subscriber";
import styles from "./chart-form.module.css";

function formatBirthDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatBirthTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

const heroImages: Record<number, string> = {
  0: "/hero-classic-builder.jpeg",
  1: "/hero-express-builder.jpeg",
  2: "/hero-initiator.jpeg",
  3: "/hero-advisor.jpeg",
  4: "/hero-evaluator.jpeg",
};

interface ChartHeroProps {
  subscriber: Subscriber;
}

export default function ChartHero({ subscriber }: ChartHeroProps) {
  const [chartOpen, setChartOpen] = useState(false);
  const closeLightbox = useCallback(() => setChartOpen(false), []);

  useEffect(() => {
    if (!chartOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [chartOpen, closeLightbox]);

  const chartRecord = subscriber.chart;
  const hd = hdChart(chartRecord.chart);
  const birthTimeUtc = chartRecord?.meta?.birthData?.time?.utc ?? null;
  const showBodygraph = !!birthTimeUtc && !subscriber.time_unknown;
  const heroSrc = chartRecord.chart.type !== undefined ? heroImages[chartRecord.chart.type] : undefined;

  return (
    <>
      {heroSrc && (
        <div className={styles.hero}>
          <Image
            src={heroSrc}
            alt={hd.careerDesign() ?? ""}
            width={1400}
            height={700}
            priority
            className={styles.heroImg}
          />
          <div className={styles.heroOverlay}>
            <h2 className={styles.heroTitle}>{hd.careerDesign()}</h2>
            {showBodygraph && (
              <button
                type="button"
                className={styles.heroBodygraph}
                onClick={() => setChartOpen(true)}
                aria-label="View full chart"
              >
                <ChartImage birthTimeUtc={birthTimeUtc} disableLightbox />
              </button>
            )}
          </div>
        </div>
      )}

      {chartRecord.chart.type !== undefined && (
        <p className={styles.heroSubtitle}>{careerDesignSubtitles[chartRecord.chart.type]}</p>
      )}

      <div className={styles.readout}>
        <div className={styles.rowitem}>
          <div className={styles.k}>Name</div>
          <div className={styles.v}>
            {subscriber.first_name}
            {subscriber.last_name && ` ${subscriber.last_name}`}
          </div>
        </div>
        <div className={styles.rowitem}>
          <div className={styles.k}>Born</div>
          <div className={styles.v}>
            {formatBirthDate(subscriber.birth_date)}
            {subscriber.birth_time && ` at ${formatBirthTime(subscriber.birth_time)}`}
            {subscriber.time_unknown && ' (time unknown)'}
          </div>
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

      {chartOpen && showBodygraph && (
        <div className={styles.lightbox} onClick={() => setChartOpen(false)}>
          <div className={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={() => setChartOpen(false)}
              aria-label="Close chart"
            >
              &times;
            </button>
            <ChartImage birthTimeUtc={birthTimeUtc} />
          </div>
        </div>
      )}
    </>
  );
}
