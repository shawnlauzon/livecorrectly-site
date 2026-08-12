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
  const isStationAustin = searchParams.get('utm_campaign') === 'station_austin_followup';
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [restartState, setRestartState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/subscribers/${subscriberId}`);
      if (!res.ok) {
        throw new Error(`Unexpected status: ${res.status}`);
      }
      const updatedData = (await res.json()) as Subscriber;

      // Log the diff
      if (subscriber) {
        console.group('Chart Refresh Diff');
        console.log('Previous chart:', subscriber.chart);
        console.log('Updated chart:', updatedData.chart);

        // Deep comparison
        const chartDiff = findDifferences(subscriber.chart, updatedData.chart);
        if (Object.keys(chartDiff).length > 0) {
          console.log('Differences found:', chartDiff);
        } else {
          console.log('No differences detected');
        }
        console.groupEnd();
      }

      setSubscriber(updatedData);
    } catch (err) {
      console.error('Failed to refresh chart:', err);
    } finally {
      setRefreshing(false);
    }
  }

  function findDifferences(obj1: any, obj2: any, path = ''): Record<string, { old: any; new: any }> {
    const diff: Record<string, { old: any; new: any }> = {};

    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (val1 === val2) continue;

      if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null) {
        if (Array.isArray(val1) && Array.isArray(val2)) {
          if (JSON.stringify(val1) !== JSON.stringify(val2)) {
            diff[currentPath] = { old: val1, new: val2 };
          }
        } else {
          const nested = findDifferences(val1, val2, currentPath);
          Object.assign(diff, nested);
        }
      } else {
        diff[currentPath] = { old: val1, new: val2 };
      }
    }

    return diff;
  }

  async function handleRestart() {
    setRestartState('loading');
    try {
      const res = await fetch(`/api/subscribers/${subscriberId}/restart-series`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(`Unexpected status: ${res.status}`);
      }
      setRestartState('success');
    } catch (err) {
      console.error('Failed to restart email series:', err);
      setRestartState('error');
    }
  }

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
      <h1 className={styles.chartName}>Your design.</h1>

      <div className={styles.card}>
        <ChartHero subscriber={subscriber} onRefresh={handleRefresh} refreshing={refreshing} />

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
        {!isFromForm && subscriber.email_status === 'active' && (
          <>
            {restartState === 'success' ? (
              <p className={styles.resultP}>
                Done &mdash; the series is on its way. Look for the first email soon.
              </p>
            ) : restartState === 'error' ? (
              <p className={styles.resultP} style={{ color: 'var(--coral)' }}>
                Something went wrong. Please try again.
              </p>
            ) : (
              <>
                {!isStationAustin && (
                  <p className={styles.resultP}>
                    Can&rsquo;t find the email series, or want to receive it again
                    from the beginning?
                  </p>
                )}
                <button
                  className={styles.btn}
                  style={{ width: 'auto' }}
                  onClick={handleRestart}
                  disabled={restartState === 'loading'}
                >
                  {restartState === 'loading'
                    ? 'Resending\u2026'
                    : isStationAustin
                      ? 'Yes I want to see more: start the series!'
                      : 'Resend the series'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
