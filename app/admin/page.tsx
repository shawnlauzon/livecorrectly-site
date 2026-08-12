'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Subscriber } from '@/lib/types/subscriber';
import { ChartRecord } from '@/lib/types/chart';
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
  const [lightboxChart, setLightboxChart] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [freshCharts, setFreshCharts] = useState<Record<string, ChartRecord>>({});
  const [saving, setSaving] = useState<string | null>(null);

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

  const handleViewChart = (chartUrl: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setLightboxChart(chartUrl);
  };

  const handleRefreshChart = async (subscriberId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setRefreshing(subscriberId);

    try {
      // Find the current subscriber data
      const currentData = subscribers.find(s => s.id === subscriberId);
      if (!currentData) {
        console.error('Subscriber not found in list');
        return;
      }

      // Extract birth details from database columns (original user input)
      console.log('Original birth data from database:', {
        birth_date: currentData.birth_date,
        birth_time: currentData.birth_time,
        time_unknown: currentData.time_unknown,
        birth_place: currentData.birth_place,
        birth_lat: currentData.birth_lat,
        birth_lng: currentData.birth_lng,
      });

      // Extract birth details from stored chart metadata
      const storedChart = currentData.chart;
      const birthData = storedChart.meta.birthData;

      // Handle both old format (nested objects) and new format (strings)
      const city = typeof birthData.location.city === 'string'
        ? birthData.location.city
        : birthData.location.city.name;

      const timezone: string = typeof birthData.location.city === 'string'
        ? (typeof birthData.time.timezone === 'string' ? birthData.time.timezone : birthData.time.timezone?.id || '')
        : birthData.location.city.timezone;

      const countryAbbr = typeof birthData.location.country === 'string'
        ? birthData.location.country
        : birthData.location.country.id;

      console.log('Birth data from chart metadata:', {
        local_time: birthData.time.local,
        city,
        timezone,
        country: countryAbbr,
      });

      // Parse local birth date and time directly from the string (avoid Date constructor timezone issues)
      const [birthDate, timeWithMs] = birthData.time.local.split('T');
      const birthTime = currentData.time_unknown ? null : timeWithMs?.substring(0, 5) ?? null; // HH:MM

      console.log('Regenerating chart with:', {
        date: birthDate,
        time: birthTime,
        timeUnknown: currentData.time_unknown,
        city,
        timezone,
        country: countryAbbr,
      });

      // Re-generate chart using Maia Mechanics API
      const { generateChart } = await import('@/lib/generate-chart');
      const freshChart = await generateChart({
        date: birthDate,
        time: birthTime,
        timeUnknown: currentData.time_unknown,
        city,
        timezone,
        countryAbbr,
      });

      console.group(`Chart Refresh Diff - ${currentData.first_name} ${currentData.last_name ?? ''}`);
      console.log('STORED CHART (entire object):', storedChart);
      console.log('FRESH CHART (entire object):', freshChart);

      // Deep comparison of the actual chart data (not metadata)
      const chartDiff = findDifferences(storedChart.chart, freshChart.chart);
      if (Object.keys(chartDiff).length > 0) {
        console.log('Chart data differences found:', chartDiff);
      } else {
        console.log('No chart data differences detected');
      }

      // Also compare metadata separately
      console.log('Metadata comparison:');
      const metaDiff = findDifferences(storedChart.meta, freshChart.meta);
      if (Object.keys(metaDiff).length > 0) {
        console.log('Metadata differences (expected):', metaDiff);
      } else {
        console.log('No metadata differences');
      }
      console.groupEnd();

      // Store fresh chart so the admin can save it
      setFreshCharts(prev => ({ ...prev, [subscriberId]: freshChart }));

    } catch (err) {
      console.error('Failed to refresh chart:', err);
    } finally {
      setRefreshing(null);
    }
  };

  const handleSaveChart = async (subscriberId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    const freshChart = freshCharts[subscriberId];
    if (!freshChart) return;

    setSaving(subscriberId);
    try {
      const pwd = sessionStorage.getItem('adminPassword') ?? '';
      const response = await fetch(`/api/admin/subscribers/${subscriberId}/update-chart`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pwd}`,
        },
        body: JSON.stringify({ chart: freshChart }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to save chart:', data.error);
        return;
      }

      const updated: Subscriber = await response.json();

      // Update subscriber in local state
      setSubscribers(prev => prev.map(s => s.id === subscriberId ? updated : s));

      // Remove from freshCharts — button reverts to refresh icon
      setFreshCharts(prev => {
        const next = { ...prev };
        delete next[subscriberId];
        return next;
      });
    } catch (err) {
      console.error('Failed to save chart:', err);
    } finally {
      setSaving(null);
    }
  };

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
          // Compare arrays element by element (recursively)
          if (val1.length !== val2.length) {
            diff[currentPath] = { old: val1, new: val2 };
          } else {
            // Deep compare each element
            const arrayDiff: Record<string, { old: any; new: any }> = {};
            for (let i = 0; i < val1.length; i++) {
              const elemDiff = findDifferences(val1[i], val2[i], `${currentPath}[${i}]`);
              Object.assign(arrayDiff, elemDiff);
            }
            if (Object.keys(arrayDiff).length > 0) {
              Object.assign(diff, arrayDiff);
            }
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
              <th style={{ width: '2rem' }}></th>
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
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                    {subscriber.chart?.meta?.birthData?.time?.utc && (() => {
                      const birthTimeUtc = subscriber.chart.meta.birthData.time.utc;
                      const time = new Date(birthTimeUtc).getTime();
                      const timeId = 1e4 * time + 621355968e9;
                      const chartUrl = `https://cdn.jovianarchive.com/RaveChartGenerator.php?Time=${timeId}`;
                      return (
                        <button
                          onClick={(e) => handleViewChart(chartUrl, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.6
                          }}
                          title="View chart"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      );
                    })()}
                    {freshCharts[subscriber.id] ? (
                      <button
                        onClick={(e) => handleSaveChart(subscriber.id, e)}
                        disabled={saving === subscriber.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: saving === subscriber.id ? 'wait' : 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: saving === subscriber.id ? 0.3 : 0.6,
                          color: '#6A4BD6',
                        }}
                        title="Save refreshed chart"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                          <polyline points="17 21 17 13 7 13 7 21"/>
                          <polyline points="7 3 7 8 15 8"/>
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleRefreshChart(subscriber.id, e)}
                        disabled={refreshing === subscriber.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: refreshing === subscriber.id ? 'wait' : 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: refreshing === subscriber.id ? 0.3 : 0.6
                        }}
                        title="Refresh chart from server"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
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

      {lightboxChart && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'zoom-out'
          }}
          onClick={() => setLightboxChart(null)}
        >
          <img
            src={lightboxChart}
            alt="Chart"
            style={{
              maxWidth: '92vw',
              maxHeight: '92vh',
              borderRadius: '8px'
            }}
          />
        </div>
      )}
    </div>
  );
}
