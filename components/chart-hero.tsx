"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { BodygraphChart } from "./bodygraph/bodygraph-chart";
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
  const showBodygraph = !!chartRecord.chart && !subscriber.birth_input.timeUnknown;
  const heroSrc = chartRecord.chart.type !== undefined ? heroImages[chartRecord.chart.type] : undefined;

  return (
    <>
      {heroSrc && (
        <div className={styles.hero}>
          <div className={styles.heroImageWrap}>
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
            </div>
          </div>
          {showBodygraph && (
            <div
              className={`${styles.heroBodygraphSide} ${chartOpen ? styles.heroBodygraphExpanded : ''}`}
              onClick={chartOpen ? undefined : () => setChartOpen(true)}
            >
              <BodygraphChart
                chart={chartRecord.chart}
                planets={chartRecord.chart.planets}
                showGateNumbers={true}
                showSidebars={true}
                notation="bg5"
              />
              {chartOpen && (
                <button
                  type="button"
                  className={styles.lightboxClose}
                  onClick={(e) => { e.stopPropagation(); setChartOpen(false); }}
                  aria-label="Close chart"
                >
                  &times;
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {chartOpen && <div className={styles.lightboxBackdrop} onClick={() => setChartOpen(false)} />}

      {chartRecord.chart.type !== undefined && (
        <p className={styles.heroSubtitle}>{careerDesignSubtitles[chartRecord.chart.type]}</p>
      )}

      <div className={styles.readout}>
        <div className={styles.rowitem}>
          <div className={styles.k}>Name</div>
          <div className={styles.v}>
            {subscriber.first_name}
            {subscriber.last_name && ` ${subscriber.last_name}`}
            {' '}&lt;{subscriber.email}&gt;
          </div>
        </div>
        <div className={styles.rowitem}>
          <div className={styles.k}>Born</div>
          <div className={styles.v}>
            {formatBirthDate(subscriber.birth_input.date)}
            {subscriber.birth_input.time && ` at ${formatBirthTime(subscriber.birth_input.time)}`}
            {subscriber.birth_input.timeUnknown && ' (time unknown)'}
            {subscriber.birth_input.city && ` in ${subscriber.birth_input.city}`}
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
    </>
  );
}
