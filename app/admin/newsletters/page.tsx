'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';

interface PublicationInfo {
  id: number;
  name: string;
  nextSendAt: string | null;
  intervalDays: number;
  timezone: string;
  issueCount: number;
  subscriberCount: number;
  lastSentAt: string | null;
}

function getPassword(): string | null {
  return sessionStorage.getItem('adminPassword');
}

function formatDate(iso: string, tz?: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...(tz ? { timeZone: tz } : {}),
  });
}

/** Format interval days as a human-readable cadence string. */
function formatCadence(days: number): string {
  if (days === 7) return 'Every week';
  if (days === 14) return 'Every 2 weeks';
  if (days === 21) return 'Every 3 weeks';
  if (days === 28) return 'Every 4 weeks';
  return `Every ${days} days`;
}

/** Format a timezone for display (e.g., "America/Chicago" → "Chicago (CST)"). */
function formatTimezone(tz: string): string {
  const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  try {
    const abbr = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? '';
    return `${city} (${abbr})`;
  } catch {
    return city;
  }
}

export default function AdminPublicationsPage() {
  const router = useRouter();
  const [publications, setPublications] = useState<PublicationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pwd = getPassword();
    if (!pwd) {
      router.push('/admin');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/admin/newsletters/publications', {
          headers: { Authorization: `Bearer ${pwd}` },
        });
        if (!res.ok) {
          if (res.status === 401) {
            sessionStorage.removeItem('adminPassword');
            router.push('/admin');
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setPublications(data.publications);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading publications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Newsletters</h1>
        <p className={styles.subtitle}>
          Manage newsletter publications.{' '}
          <Link href="/admin" style={{ color: 'var(--grape)' }}>
            Back to subscribers
          </Link>
          {' \u00b7 '}
          <Link href="/admin/contacts" style={{ color: 'var(--grape)' }}>
            Contact sync
          </Link>
        </p>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Publication</th>
            <th style={{ width: '10rem' }}>Cadence</th>
            <th style={{ width: '10rem' }}>Next send</th>
            <th style={{ width: '5rem', textAlign: 'center' }}>Issues</th>
            <th style={{ width: '7rem', textAlign: 'center' }}>Subscribers</th>
            <th style={{ width: '10rem' }}>Last sent</th>
          </tr>
        </thead>
        <tbody>
          {publications.map((pub) => (
            <tr
              key={pub.id}
              onClick={() => router.push(`/admin/newsletters/${pub.id}`)}
            >
              <td style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {pub.name}
              </td>
              <td>
                {formatCadence(pub.intervalDays)}
                {' \u00b7 '}
                {formatTimezone(pub.timezone)}
              </td>
              <td>
                {pub.nextSendAt
                  ? formatDate(pub.nextSendAt, pub.timezone)
                  : <span style={{ color: 'var(--muted)' }}>Not set</span>
                }
              </td>
              <td style={{ textAlign: 'center' }}>{pub.issueCount}</td>
              <td style={{ textAlign: 'center' }}>{pub.subscriberCount}</td>
              <td>
                {pub.lastSentAt
                  ? formatDate(pub.lastSentAt, pub.timezone)
                  : <span style={{ color: 'var(--muted)' }}>Never</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {publications.length === 0 && (
        <div className={styles.empty}>No publications found</div>
      )}
    </div>
  );
}
