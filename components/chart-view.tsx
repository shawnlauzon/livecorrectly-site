'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ChartHero from './chart-hero';
import styles from './chart-form.module.css';
import { Subscriber } from '@/lib/types/subscriber';

interface ChartViewProps {
  subscriberId: string;
}

export default function ChartView({ subscriberId }: ChartViewProps) {
  const searchParams = useSearchParams();
  const isFromForm = searchParams.get('utm_source') === 'form';
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
        console.error('Failed to load chart:', err);
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
        <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
          Loading your chart&hellip;
        </p>
      </div>
    );
  }

  if (notFound || !subscriber) {
    return (
      <div className={styles.card}>
        <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
          Chart not found. The link may be incorrect.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className={styles.chartName}>
        {subscriber.first_name}
        {subscriber.last_name && ` ${subscriber.last_name}`}&rsquo;s design.
      </h1>

      <div className={styles.card}>
        <ChartHero subscriber={subscriber} />

        <p className={styles.resultP} style={{ marginTop: 28 }}>
          That&rsquo;s the data. If most of it doesn&rsquo;t mean much to you,
          that&rsquo;s expected: these are terms without the description behind
          them.
        </p>
        {isFromForm && (
          <p className={styles.resultP}>
            Check your inbox, I&rsquo;ve sent you the first email. Gmail sometimes
            files it under Promotions, so drag it to Primary if you want to see
            the rest.
          </p>
        )}
      </div>
    </>
  );
}
