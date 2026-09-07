'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ChartHero from './chart-hero';
import styles from './chart-form.module.css';
import { Subscriber } from '@/lib/types/subscriber';
import { track } from '@/lib/analytics';

interface ChartViewProps {
  subscriberId: string;
}

export default function ChartView({ subscriberId }: ChartViewProps) {
  const searchParams = useSearchParams();
  const isFromForm = searchParams.get('from') === 'form';
  const isStationAustin = searchParams.get('utm_campaign') === 'station_austin_followup';
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [restartState, setRestartState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleRestart() {
    setRestartState('loading');
    track('email_series_restart', { status: 'attempt' });
    try {
      const res = await fetch(`/api/subscribers/${subscriberId}/restart-series`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(`Unexpected status: ${res.status}`);
      }
      setRestartState('success');
      track('email_series_restart', { status: 'success' });
    } catch (err) {
      console.error('Failed to restart email series:', err);
      setRestartState('error');
      track('email_series_restart', { status: 'error' });
    }
  }

  const isPreview = searchParams.get('preview') === 'true';

  useEffect(() => {
    async function fetchSubscriber() {
      try {
        const url = `/api/subscribers/${subscriberId}${isPreview ? '?preview=true' : ''}`;
        const res = await fetch(url);
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
  }, [subscriberId, isPreview]);

  // Track chart view once subscriber loads
  useEffect(() => {
    if (!subscriber) return;
    const source = isFromForm ? 'form'
      : (searchParams.get('utm_source') || searchParams.get('utm_campaign')) ? 'email'
      : 'direct';
    track('chart_view', { source, type: subscriber.chart?.chart?.type });
  }, [subscriber]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track engagement at 30s and 60s
  useEffect(() => {
    if (!subscriber) return;
    const timers = [
      setTimeout(() => track('chart_engagement', { seconds: 30 }), 30_000),
      setTimeout(() => track('chart_engagement', { seconds: 60 }), 60_000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [subscriber]);

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
      <h1 className={styles.chartName}>Design for {subscriber.first_name}{subscriber.last_name ? ` ${subscriber.last_name}` : ''}</h1>

      <div className={styles.card}>
        <ChartHero subscriber={subscriber} subscriberId={subscriberId} />

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
