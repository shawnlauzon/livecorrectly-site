'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Subscriber } from '@/lib/types/subscriber';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import hdChart from '@/lib/hd-chart';
import { channelStrengths, shadowNames } from '@/lib/hd-chart/constants';
import styles from './admin.module.css';

async function fetchSubscribers(pwd: string): Promise<{ ok: true; data: Subscriber[] } | { ok: false; error: string }> {
  try {
    const response = await fetch('/api/admin/subscribers', {
      headers: {
        Authorization: `Bearer ${pwd}`
      }
    });

    if (!response.ok) {
      sessionStorage.removeItem('adminPassword');
      return { ok: false, error: 'Session expired' };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    console.error('Error loading subscribers:', err);
    return { ok: false, error: `Failed to load subscribers: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

function getFirstShadowLabel(subscriber: Subscriber): string {
  if (!subscriber.chart?.chart) return '—';

  const hd = hdChart(subscriber.chart.chart);
  const shadows = hd.getShadows();
  if (shadows.length === 0) return '—';

  const firstShadow = shadows[0];

  if (firstShadow !== 'Bringing Traits/Strengths') {
    return shadowNames[firstShadow] ?? firstShadow;
  }

  const top = hd.getTopBridge();
  if (!top) return '—';

  const label = `${top.bridge.trait} (${top.bridge.gate})`;
  return top.annotation ? `${label} · ${top.annotation}` : label;
}

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('adminPassword') ?? '';
    }
    return '';
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!sessionStorage.getItem('adminPassword');
    }
    return false;
  });
  const [error, setError] = useState('');

  const loadSubscribers = useCallback(async (pwd: string) => {
    setLoading(true);
    setError('');
    const result = await fetchSubscribers(pwd);
    if (result.ok) {
      setSubscribers(result.data);
      setIsAuthorized(true);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('adminPassword');
    if (!savedPassword) return;

    let cancelled = false;

    (async () => {
      const result = await fetchSubscribers(savedPassword);
      if (cancelled) return;
      if (result.ok) {
        setSubscribers(result.data);
        setIsAuthorized(true);
      } else {
        setError(result.error);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  // Reload subscribers when returning via back navigation (bfcache restore)
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        const savedPassword = sessionStorage.getItem('adminPassword');
        if (savedPassword) {
          loadSubscribers(savedPassword);
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [loadSubscribers]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Store password in sessionStorage for detail page
    sessionStorage.setItem('adminPassword', password);
    await loadSubscribers(password);
  };

  const handleRowClick = (id: string) => {
    router.push(`/admin/${id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEngagementLabel = (sub: Subscriber): { label: string; stale: boolean } => {
    if (!sub.last_engaged_at) return { label: '\u2014', stale: false };
    const now = Date.now();
    const then = new Date(sub.last_engaged_at).getTime();
    const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
    if (days === 0) return { label: 'Today', stale: false };
    if (days === 1) return { label: '1 day', stale: false };
    return { label: `${days} days`, stale: days > 90 };
  };

  const getNextEmailLabel = (sub: Subscriber): string => {
    if (sub.email_status !== 'active') return '—';
    if (sub.next_step > WELCOME_SERIES_LENGTH) return 'Done';
    if (sub.next_send_at) return `Day ${sub.next_step}`;
    if (sub.next_step === 0) return 'Not started';
    return `Paused @ ${sub.next_step}`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading subscribers...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin Access</h1>
        </div>
        <form onSubmit={handlePasswordSubmit} className={styles.passwordForm}>
          <label htmlFor="password" className={styles.passwordLabel}>
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.passwordInput}
            placeholder="Enter admin password"
            autoFocus
          />
          <button type="submit" className={styles.submitButton}>
            Sign In
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Subscribers</h1>
        <p className={styles.subtitle}>{subscribers.length} total</p>
      </div>

      {subscribers.length === 0 ? (
        <div className={styles.empty}>No subscribers yet</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Type</th>
              <th>Strengths</th>
              <th>#1 Shadow</th>
              <th style={{ textAlign: 'center', width: '4rem' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Next Email</th>
              <th>Created</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((subscriber) => {
              const engagement = getEngagementLabel(subscriber);
              return (
              <tr
                key={subscriber.id}
                onClick={() => handleRowClick(subscriber.id)}
              >
                <td>{subscriber.email}</td>
                <td>
                  {subscriber.first_name}{' '}
                  {subscriber.last_name ? subscriber.last_name : ''}
                </td>
                <td>
                  {subscriber.chart
                    ? ['Generator', 'MG', 'Manifestor', 'Projector', 'Reflector'][
                        subscriber.chart.chart.type
                      ]
                    : '-'}
                </td>
                <td>
                  {subscriber.chart?.chart.channels?.length
                    ? subscriber.chart.chart.channels
                        .map(i => `${channelStrengths[i]?.name ?? '?'} (${i})`)
                        .join(', ')
                    : '—'}
                </td>
                <td>{getFirstShadowLabel(subscriber)}</td>
                <td className={subscriber.email_status === 'active' ? styles.statusOk : styles.statusBad}>
                  {subscriber.email_status === 'active' ? (
                    '✓'
                  ) : (
                    <span title={subscriber.email_status}>✗</span>
                  )}
                </td>
                <td className={styles.nextEmail}>
                  {getNextEmailLabel(subscriber)}
                </td>
                <td>{formatDate(subscriber.created_at)}</td>
                <td className={engagement.stale ? styles.engagementStale : undefined}>
                  {engagement.label}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
