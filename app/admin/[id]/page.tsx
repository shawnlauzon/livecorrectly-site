'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Subscriber } from '@/lib/types/subscriber';
import ChartDisplay from '@/components/admin/chart-display';
import ChartImage from '@/components/admin/chart-image';
import styles from './detail.module.css';

export default function AdminDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscriberId, setSubscriberId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => setSubscriberId(id));
  }, [params]);

  useEffect(() => {
    if (!subscriberId) return;

    const password = sessionStorage.getItem('adminPassword');
    if (!password) {
      router.push('/admin');
      return;
    }

    fetchSubscriber(password, subscriberId);
  }, [subscriberId]);

  const fetchSubscriber = async (password: string, id: string) => {
    try {
      const response = await fetch(`/api/admin/subscribers/${id}`, {
        headers: {
          Authorization: `Bearer ${password}`
        }
      });

      if (response.status === 401) {
        router.push('/admin');
        return;
      }

      if (!response.ok) {
        setError('Failed to load subscriber');
        return;
      }

      const data = await response.json();
      setSubscriber(data);
    } catch (err) {
      setError('Failed to load subscriber');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading subscriber...</p>
      </div>
    );
  }

  if (error || !subscriber) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>{error || 'Subscriber not found'}</p>
        <div style={{ textAlign: 'center' }}>
          <Link href="/admin" className={styles.backLink}>
            &larr; Back to list
          </Link>
        </div>
      </div>
    );
  }

  const birthTimeUtc = subscriber.chart?.meta?.birthData?.time?.utc;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/admin" className={styles.backLink}>
          &larr; Back to list
        </Link>
        <h1 className={styles.title}>
          {subscriber.first_name}{' '}
          {subscriber.last_name ? subscriber.last_name : ''}
        </h1>
        <p className={styles.subtitle}>{subscriber.email}</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <ChartDisplay subscriber={subscriber} />
        </div>

        {birthTimeUtc && (
          <div className={styles.card}>
            <ChartImage birthTimeUtc={birthTimeUtc} />
          </div>
        )}
      </div>
    </div>
  );
}
