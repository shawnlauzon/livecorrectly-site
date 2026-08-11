'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Subscriber } from '@/lib/types/subscriber';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import hdChart from '@/lib/hd-chart';
import { shadowNames, functionToCenterIndex, centerNames, innerAuthorityTypes } from '@/lib/hd-chart/constants';
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

  const firstShadowFunction = shadows[0];

  // For bridging shadow, show split type and bridges
  if (firstShadowFunction === 'Bringing Traits/Strengths') {
    // Find number of defined components to determine split type
    const components = hd.findDefinedComponents();
    const numComponents = components.length;

    // Determine split type and number of bridges to show based on component count
    let splitType = '';
    let numBridgesToShow = 0;

    if (numComponents === 2) {
      splitType = 'Simple split';
      numBridgesToShow = 1;
    } else if (numComponents === 3) {
      splitType = 'Wide split';
      numBridgesToShow = 2;
    } else if (numComponents >= 4) {
      splitType = 'Very wide split';
      numBridgesToShow = 3;
    } else {
      // Shouldn't happen for bridging shadows, but handle gracefully
      return firstShadowFunction;
    }

    // Get all bridges (near + far) sorted by priority
    const allBridges = hd.getAllBridgesSorted();

    if (allBridges.length === 0) {
      return `${splitType}: —`;
    }

    // Show exactly the number of bridges needed for this split type
    const bridgesToDisplay = allBridges.slice(0, numBridgesToShow);
    const bridgeLabels = bridgesToDisplay
      .map(b => `${b.trait} (${b.gate})`)
      .join(', ');

    return `${splitType}: ${bridgeLabels}`;
  }

  // For non-bridging shadows, show the function name and center
  const centerIndex = functionToCenterIndex[firstShadowFunction];
  if (centerIndex !== null && centerIndex !== undefined) {
    const centerName = centerNames[centerIndex];
    return `${firstShadowFunction} (${centerName})`;
  }

  return firstShadowFunction;
}

type SortColumn = 'name' | 'email' | 'profile' | 'authority' | 'type' | 'shadow' | 'status' | 'nextEmail' | 'created' | 'lastActive';
type SortDirection = 'asc' | 'desc';

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
  const [sortColumn, setSortColumn] = useState<SortColumn>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyEmail = async (email: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
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
    const totalDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) return { label: 'Today', stale: false };

    const yearsFull = totalDays / 365;
    const months = Math.floor(totalDays / 30);
    const days = totalDays;

    let label: string;
    if (yearsFull >= 1) {
      const yearsRounded = Math.round(yearsFull * 10) / 10;
      label = `${yearsRounded}\u00A0${yearsRounded === 1 ? 'year' : 'years'}`;
    } else if (months > 0) {
      label = `${months}\u00A0${months === 1 ? 'month' : 'months'}`;
    } else {
      label = `${days}\u00A0${days === 1 ? 'day' : 'days'}`;
    }

    return { label, stale: totalDays > 90 };
  };

  const getNextEmailLabel = (sub: Subscriber): string => {
    if (sub.email_status !== 'active') return '—';
    if (sub.next_step > WELCOME_SERIES_LENGTH) return 'Done';
    if (sub.next_send_at) return `Day ${sub.next_step}`;
    if (sub.next_step === 0) return 'Not started';
    return `Paused @ ${sub.next_step}`;
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortValue = (subscriber: Subscriber, column: SortColumn): string | number => {
    switch (column) {
      case 'name':
        return `${subscriber.first_name} ${subscriber.last_name ?? ''}`.toLowerCase();
      case 'email':
        return subscriber.email.toLowerCase();
      case 'profile':
        if (!subscriber.chart?.chart.profile) return '';
        return subscriber.chart.chart.profile;
      case 'authority':
        if (subscriber.chart?.chart.authority === undefined) return '';
        return innerAuthorityTypes[subscriber.chart.chart.authority];
      case 'type':
        if (!subscriber.chart) return '';
        return ['Generator', 'MG', 'Manifestor', 'Projector', 'Reflector'][subscriber.chart.chart.type];
      case 'shadow':
        return getFirstShadowLabel(subscriber);
      case 'status':
        return subscriber.email_status;
      case 'nextEmail':
        return subscriber.next_step ?? 0;
      case 'created':
        return new Date(subscriber.created_at).getTime();
      case 'lastActive':
        if (!subscriber.last_engaged_at) return 0;
        return new Date(subscriber.last_engaged_at).getTime();
      default:
        return '';
    }
  };

  const sortedSubscribers = [...subscribers].sort((a, b) => {
    const aVal = getSortValue(a, sortColumn);
    const bVal = getSortValue(b, sortColumn);

    if (aVal === bVal) return 0;

    const comparison = aVal < bVal ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

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
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Name<span style={{ display: 'inline-block', width: '1em', textAlign: 'center' }}>
                  {sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </span>
              </th>
              <th onClick={() => handleSort('email')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Email<span style={{ display: 'inline-block', width: '1em', textAlign: 'center' }}>
                  {sortColumn === 'email' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </span>
              </th>
              <th onClick={() => handleSort('profile')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Profile<span style={{ display: 'inline-block', width: '1em', textAlign: 'center' }}>
                  {sortColumn === 'profile' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </span>
              </th>
              <th onClick={() => handleSort('authority')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Authority<span style={{ display: 'inline-block', width: '1em', textAlign: 'center' }}>
                  {sortColumn === 'authority' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </span>
              </th>
              <th onClick={() => handleSort('type')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Type<span style={{ display: 'inline-block', width: '1em', textAlign: 'center' }}>
                  {sortColumn === 'type' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </span>
              </th>
              <th onClick={() => handleSort('shadow')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                #1 Shadow<span style={{ display: 'inline-block', width: '1em', textAlign: 'center' }}>
                  {sortColumn === 'shadow' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </span>
              </th>
              <th onClick={() => handleSort('status')} style={{ textAlign: 'center', width: '4rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Status<span style={{ display: 'inline-block', width: '1em', textAlign: 'center' }}>
                  {sortColumn === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </span>
              </th>
              <th onClick={() => handleSort('nextEmail')} style={{ textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Email<span style={{ display: 'inline-block', width: '1em', textAlign: 'center' }}>
                  {sortColumn === 'nextEmail' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </span>
              </th>
              <th onClick={() => handleSort('created')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Created<span style={{ display: 'inline-block', width: '1em', textAlign: 'center' }}>
                  {sortColumn === 'created' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </span>
              </th>
              <th onClick={() => handleSort('lastActive')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Active<span style={{ display: 'inline-block', width: '1em', textAlign: 'center' }}>
                  {sortColumn === 'lastActive' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSubscribers.map((subscriber) => {
              const engagement = getEngagementLabel(subscriber);
              const hd = subscriber.chart?.chart ? hdChart(subscriber.chart.chart) : null;
              return (
              <tr
                key={subscriber.id}
                onClick={() => handleRowClick(subscriber.id)}
              >
                <td>
                  {subscriber.first_name}{' '}
                  {subscriber.last_name ? subscriber.last_name : ''}
                </td>
                <td style={{ maxWidth: '12rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subscriber.email}
                    </span>
                    <button
                      onClick={(e) => handleCopyEmail(subscriber.email, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        opacity: 0.6,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={copiedEmail === subscriber.email ? 'Copied!' : 'Copy email'}
                    >
                      {copiedEmail === subscriber.email ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
                <td>
                  {subscriber.chart?.chart.profile
                    ? `${String(subscriber.chart.chart.profile)[0]}/${String(subscriber.chart.chart.profile)[1]}`
                    : '—'}
                </td>
                <td>
                  {subscriber.chart?.chart.authority !== undefined
                    ? innerAuthorityTypes[subscriber.chart.chart.authority]
                    : '—'}
                </td>
                <td>
                  {subscriber.chart
                    ? ['Generator', 'MG', 'Manifestor', 'Projector', 'Reflector'][
                        subscriber.chart.chart.type
                      ]
                    : '-'}
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
