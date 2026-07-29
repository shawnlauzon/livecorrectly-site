'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Subscriber } from '@/lib/types/subscriber';
import styles from './admin.module.css';

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check for existing session on mount
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('adminPassword');
    if (savedPassword) {
      setPassword(savedPassword);
      loadSubscribers(savedPassword);
    } else {
      setLoading(false);
    }
  }, []);

  // Reload subscribers when returning via back navigation (bfcache restore)
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        const savedPassword = sessionStorage.getItem('adminPassword');
        if (savedPassword) {
          setPassword(savedPassword);
          loadSubscribers(savedPassword);
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const loadSubscribers = async (pwd: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/subscribers', {
        headers: {
          Authorization: `Bearer ${pwd}`
        }
      });

      if (!response.ok) {
        sessionStorage.removeItem('adminPassword');
        setError('Session expired');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setSubscribers(data);
      setIsAuthorized(true);
    } catch (err) {
      console.error('Error loading subscribers:', err);
      setError(`Failed to load subscribers: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

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
