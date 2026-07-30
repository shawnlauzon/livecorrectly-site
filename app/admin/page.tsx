'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Subscriber } from '@/lib/types/subscriber';
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
              <th>Birth Date</th>
              <th>Type</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((subscriber) => (
              <tr
                key={subscriber.id}
                onClick={() => handleRowClick(subscriber.id)}
              >
                <td>{subscriber.email}</td>
                <td>
                  {subscriber.first_name}{' '}
                  {subscriber.last_name ? subscriber.last_name : ''}
                </td>
                <td>{subscriber.birth_date}</td>
                <td>
                  {subscriber.chart
                    ? ['Generator', 'MG', 'Manifestor', 'Projector', 'Reflector'][
                        subscriber.chart.chart.type
                      ]
                    : '-'}
                </td>
                <td>{formatDate(subscriber.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
