'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';

interface NewsletterSchedule {
  id: number;
  broadcastId: string;
  scheduledAt: string;
  subscriberCount: number;
  status: string;
  createdAt: string;
}

interface ReadySubscriber {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
}

interface NewsletterInfo {
  number: number;
  subject: string;
  slug: string | null;
  hasLiquid: boolean;
  sentCount: number;
  nextWeekCount: number;
  laterCount: number;
  projectedSendAt: string | null;
  nextWeekSubscribers: ReadySubscriber[];
  laterSubscribers: ReadySubscriber[];
  schedule: NewsletterSchedule | null;
}

interface NewslettersResponse {
  newsletters: NewsletterInfo[];
}

function getPassword(): string | null {
  return sessionStorage.getItem('adminPassword');
}

function formatDateTime(iso: string, tz?: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...(tz ? { timeZone: tz } : {}),
  });
}

/** Convert an ISO string to a datetime-local input value in the given timezone. */
function toDatetimeLocal(iso: string, tz: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** Interval options for the repeat cadence. */
const INTERVAL_OPTIONS = [
  { label: 'Every week', days: 7 },
  { label: 'Every 2 weeks', days: 14 },
  { label: 'Every 3 weeks', days: 21 },
  { label: 'Every 4 weeks', days: 28 },
];

/** Common timezones for the selector. */
const TIMEZONE_OPTIONS = [
  'America/Chicago',
  'America/New_York',
  'America/Denver',
  'America/Los_Angeles',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
];

/**
 * Convert a datetime-local value + timezone to a UTC ISO string.
 * Uses the Intl API to resolve the timezone offset at the given date.
 */
function localToUtcIso(datetimeLocal: string, timezone: string): string {
  // Parse the datetime-local string as if it's in the given timezone
  // by constructing a Date in UTC and then adjusting for the timezone offset.
  const [datePart, timePart] = datetimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Create a formatter that outputs UTC offset for the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset',
  });

  // Use a reference date close to the target to get the correct offset
  const rough = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = formatter.formatToParts(rough);
  const tzNamePart = parts.find(p => p.type === 'timeZoneName')?.value ?? '+00:00';

  // Parse offset like "GMT-5" or "GMT+5:30" or "GMT"
  let offsetMinutes = 0;
  const offsetMatch = tzNamePart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const hours = parseInt(offsetMatch[2], 10);
    const mins = parseInt(offsetMatch[3] ?? '0', 10);
    offsetMinutes = sign * (hours * 60 + mins);
  }

  // The datetime-local is in the selected timezone, so subtract the offset to get UTC
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60 * 1000;
  return new Date(utcMs).toISOString();
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

/**
 * Compute projected send dates for unsent newsletters based on a start date + interval.
 * The nextSendAtUtc should be a UTC ISO string (already timezone-converted).
 * Returns a Map from newsletter number to ISO string.
 */
function computeProjectedDates(
  newsletters: NewsletterInfo[],
  nextSendAtUtc: string,
  intervalDays: number,
): Map<number, string> {
  const dates = new Map<number, string>();
  const startDate = new Date(nextSendAtUtc);
  let slot = 0;

  for (const nl of newsletters) {
    // Already scheduled or sent — keep the actual date
    if (nl.schedule?.status === 'scheduled' || nl.schedule?.status === 'sent') {
      continue;
    }
    // Unsent — assign the next available cadence slot
    const sendDate = new Date(startDate.getTime() + slot * intervalDays * 24 * 60 * 60 * 1000);
    dates.set(nl.number, sendDate.toISOString());
    slot++;
  }

  return dates;
}

export default function AdminNewslettersPage() {
  const router = useRouter();
  const [newsletters, setNewsletters] = useState<NewsletterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [expandedReady, setExpandedReady] = useState<number | null>(null);
  const [expandedLater, setExpandedLater] = useState<number | null>(null);
  const [confirmSchedule, setConfirmSchedule] = useState<number | null>(null);

  // Cadence controls
  const [nextSendAt, setNextSendAt] = useState<string>('');
  const [intervalDays, setIntervalDays] = useState<number>(7);
  const [timezone, setTimezone] = useState<string>('America/Chicago');

  const fetchNewsletters = useCallback(async () => {
    const pwd = getPassword();
    if (!pwd) {
      router.push('/admin');
      return;
    }

    try {
      const res = await fetch('/api/admin/newsletters', {
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
      const data: NewslettersResponse = await res.json();
      setNewsletters(data.newsletters);

      // Initialize the cadence date picker from the first unsent newsletter's projected date
      if (!nextSendAt) {
        const firstUnsent = data.newsletters.find(
          nl => nl.schedule?.status !== 'scheduled' && nl.schedule?.status !== 'sent',
        );
        if (firstUnsent?.projectedSendAt) {
          setNextSendAt(toDatetimeLocal(firstUnsent.projectedSendAt, timezone));
        }
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void (async () => { await fetchNewsletters(); })();
  }, [fetchNewsletters]);

  const handleSchedule = async (newsletterNumber: number, sendAt?: string | null) => {
    const pwd = getPassword();
    if (!pwd) return;

    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/newsletters/schedule', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newsletterNumber, ...(sendAt && { sendAt }) }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }

      setActionMessage(
        `Scheduled! Broadcast ${data.broadcastId}, ${data.contactCount} contacts for ${formatDateTime(data.scheduledAt, timezone)}`,
      );
      setConfirmSchedule(null);
      await fetchNewsletters();
    } catch (err) {
      setActionMessage(
        `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (newsletterNumber: number) => {
    const pwd = getPassword();
    if (!pwd) return;

    if (!confirm(`Cancel newsletter #${newsletterNumber}? This will roll back subscriber progress.`)) {
      return;
    }

    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/newsletters/cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newsletterNumber }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }

      setActionMessage(
        `Cancelled. Rolled back ${data.rolledBack}/${data.totalAffected} subscribers.`,
      );
      await fetchNewsletters();
    } catch (err) {
      setActionMessage(
        `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  /** Render a clickable subscriber count that expands to show the list. */
  function renderSubscriberCount(
    count: number,
    isExpanded: boolean,
    onToggle: () => void,
  ) {
    if (count === 0) {
      return <span style={{ color: 'var(--muted)' }}>0</span>;
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--body)',
          fontSize: '0.875rem',
          color: 'var(--grape)',
          fontWeight: 600,
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
          padding: 0,
        }}
        title="Show subscribers"
      >
        {count}
      </button>
    );
  }

  /** Render an expanded subscriber list row. */
  function renderSubscriberList(
    label: string,
    subscribers: ReadySubscriber[],
    onClose: () => void,
  ) {
    return (
      <tr>
        <td colSpan={8} style={{ padding: 0 }}>
          <div
            style={{
              background: 'var(--paper)',
              padding: '0.5rem 1rem',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.375rem',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--body)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {label}
              </span>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontSize: '0.75rem',
                  padding: '2px 4px',
                }}
              >
                Close
              </button>
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'var(--body)',
                fontSize: '0.8125rem',
              }}
            >
              <tbody>
                {subscribers.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => router.push(`/admin/${sub.id}`)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'var(--card)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = '')
                    }
                  >
                    <td
                      style={{
                        padding: '0.25rem 0.5rem',
                        color: 'var(--ink)',
                        fontWeight: 500,
                      }}
                    >
                      {sub.firstName}
                      {sub.lastName ? ` ${sub.lastName}` : ''}
                    </td>
                    <td
                      style={{
                        padding: '0.25rem 0.5rem',
                        color: 'var(--muted)',
                      }}
                    >
                      {sub.email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    );
  }

  // Compute projected send dates from the cadence controls (convert local → UTC)
  const nextSendAtUtc = useMemo(
    () => nextSendAt ? localToUtcIso(nextSendAt, timezone) : null,
    [nextSendAt, timezone],
  );

  const projectedDates = useMemo(
    () => nextSendAtUtc
      ? computeProjectedDates(newsletters, nextSendAtUtc, intervalDays)
      : new Map<number, string>(),
    [newsletters, nextSendAtUtc, intervalDays],
  );

  /** Get the effective send date for a newsletter (actual schedule or projected). */
  const getSendDate = useCallback((nl: NewsletterInfo): string | null => {
    if (nl.schedule?.status === 'scheduled' || nl.schedule?.status === 'sent') {
      return nl.schedule.scheduledAt;
    }
    return projectedDates.get(nl.number) ?? nl.projectedSendAt;
  }, [projectedDates]);

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading newsletters...</p>
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
          Schedule and manage newsletter broadcasts.{' '}
          <Link href="/admin" style={{ color: 'var(--grape)' }}>
            Back to subscribers
          </Link>
          {' \u00b7 '}
          <Link href="/admin/contacts" style={{ color: 'var(--grape)' }}>
            Contact sync
          </Link>
        </p>
      </div>

      {/* Cadence controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: 'var(--card)',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <label
          style={{
            fontFamily: 'var(--body)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Next send
          <input
            type="datetime-local"
            value={nextSendAt}
            onChange={(e) => setNextSendAt(e.target.value)}
            style={{
              fontFamily: 'var(--body)',
              fontSize: '0.875rem',
              color: 'var(--ink)',
              padding: '0.375rem 0.5rem',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              background: '#fff',
            }}
          />
        </label>
        <label
          style={{
            fontFamily: 'var(--body)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Repeat
          <select
            value={intervalDays}
            onChange={(e) => setIntervalDays(Number(e.target.value))}
            style={{
              fontFamily: 'var(--body)',
              fontSize: '0.875rem',
              color: 'var(--ink)',
              padding: '0.375rem 0.5rem',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              background: '#fff',
            }}
          >
            {INTERVAL_OPTIONS.map(opt => (
              <option key={opt.days} value={opt.days}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label
          style={{
            fontFamily: 'var(--body)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Timezone
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{
              fontFamily: 'var(--body)',
              fontSize: '0.875rem',
              color: 'var(--ink)',
              padding: '0.375rem 0.5rem',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              background: '#fff',
            }}
          >
            {TIMEZONE_OPTIONS.map(tz => (
              <option key={tz} value={tz}>{formatTimezone(tz)}</option>
            ))}
          </select>
        </label>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            background: actionMessage.startsWith('Error')
              ? '#FFF5F5'
              : '#F0FFF4',
            color: actionMessage.startsWith('Error')
              ? 'var(--coral)'
              : '#1a7a3a',
            fontFamily: 'var(--body)',
            fontSize: '0.875rem',
          }}
        >
          {actionMessage}
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '3rem', textAlign: 'center' }}>#</th>
            <th>Subject</th>
            <th style={{ width: '4.5rem', textAlign: 'center' }}>Sent</th>
            <th style={{ width: '6rem', textAlign: 'center' }}>Next week</th>
            <th style={{ width: '5.5rem', textAlign: 'center' }}>2+ weeks</th>
            <th style={{ width: '6rem', textAlign: 'center' }}>Status</th>
            <th style={{ width: '10rem' }}>Send date</th>
            <th style={{ width: '10rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {newsletters.map((nl) => (
            <React.Fragment key={nl.number}>
            <tr
              style={{
                cursor: expandedReady === nl.number || expandedLater === nl.number ? 'pointer' : 'default',
                verticalAlign: 'top',
              }}
              onClick={() => {
                if (expandedReady === nl.number) setExpandedReady(null);
                if (expandedLater === nl.number) setExpandedLater(null);
              }}
            >
              <td style={{ textAlign: 'center', fontWeight: 600 }}>
                {nl.number}
              </td>
              <td>
                <Link
                  href={`/admin/newsletters/${nl.number}`}
                  style={{
                    color: 'var(--ink)',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = 'var(--grape)';
                    (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline';
                    (e.currentTarget as HTMLAnchorElement).style.textUnderlineOffset = '2px';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink)';
                    (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none';
                  }}
                >
                  {nl.subject}
                </Link>
                {nl.hasLiquid && (
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.6875rem',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      background: 'var(--paper)',
                      color: 'var(--grape)',
                      fontWeight: 600,
                    }}
                  >
                    LIQUID
                  </span>
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                {nl.sentCount > 0 ? (
                  <span style={{ color: '#1a7a3a', fontWeight: 600 }}>
                    {nl.sentCount}
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>0</span>
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                {renderSubscriberCount(
                  nl.nextWeekCount,
                  expandedReady === nl.number,
                  () => {
                    setExpandedReady(expandedReady === nl.number ? null : nl.number);
                    setExpandedLater(null);
                  },
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                {renderSubscriberCount(
                  nl.laterCount,
                  expandedLater === nl.number,
                  () => {
                    setExpandedLater(expandedLater === nl.number ? null : nl.number);
                    setExpandedReady(null);
                  },
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                {nl.schedule?.status === 'scheduled' ? (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '3px',
                      background: '#E6F9ED',
                      color: '#1a7a3a',
                    }}
                  >
                    Scheduled
                  </span>
                ) : nl.schedule?.status === 'sent' ? (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '3px',
                      background: 'var(--paper)',
                      color: 'var(--muted)',
                    }}
                  >
                    Sent
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '3px',
                      background: '#FFF5F5',
                      color: 'var(--coral)',
                    }}
                  >
                    Unscheduled
                  </span>
                )}
              </td>
              <td>
                <span
                  style={{
                    fontFamily: 'var(--body)',
                    fontSize: '0.75rem',
                    color: 'var(--muted)',
                  }}
                >
                  {(nl.schedule?.status === 'scheduled' || nl.schedule?.status === 'sent') && getSendDate(nl)
                    ? formatDateTime(getSendDate(nl)!, timezone)
                    : '—'}
                </span>
              </td>
              <td>
                <div
                  style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Schedule button — show if not currently scheduled and has next-week subscribers */}
                  {nl.schedule?.status !== 'scheduled' && nl.nextWeekCount > 0 && (
                    <>
                      {confirmSchedule === nl.number ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.375rem',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: 'var(--body)',
                              fontSize: '0.75rem',
                              color: 'var(--muted)',
                            }}
                          >
                            {nl.nextWeekCount} subscriber{nl.nextWeekCount === 1 ? '' : 's'}
                          </div>
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            <button
                              onClick={() => handleSchedule(nl.number, getSendDate(nl))}
                              disabled={actionLoading}
                              style={{
                                fontFamily: 'var(--body)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '4px 10px',
                                background: 'var(--grape)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: actionLoading ? 'wait' : 'pointer',
                                opacity: actionLoading ? 0.6 : 1,
                              }}
                            >
                              {actionLoading ? 'Scheduling...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setConfirmSchedule(null)}
                              style={{
                                fontFamily: 'var(--body)',
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                background: 'none',
                                color: 'var(--muted)',
                                border: '1px solid var(--line)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setConfirmSchedule(nl.number);
                            setActionMessage(null);
                          }}
                          style={{
                            fontFamily: 'var(--body)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '4px 12px',
                            background: 'var(--grape)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Schedule
                        </button>
                      )}
                    </>
                  )}

                  {/* Unschedule button — only when scheduled */}
                  {nl.schedule?.status === 'scheduled' && (
                    <button
                      onClick={() => handleCancel(nl.number)}
                      disabled={actionLoading}
                      style={{
                        fontFamily: 'var(--body)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '4px 12px',
                        background: 'none',
                        color: 'var(--coral)',
                        border: '1px solid var(--coral)',
                        borderRadius: '4px',
                        cursor: actionLoading ? 'wait' : 'pointer',
                        opacity: actionLoading ? 0.6 : 1,
                      }}
                    >
                      Unschedule
                    </button>
                  )}

                </div>
              </td>
            </tr>
            {expandedReady === nl.number && nl.nextWeekSubscribers.length > 0 &&
              renderSubscriberList(
                'Next week subscribers',
                nl.nextWeekSubscribers,
                () => setExpandedReady(null),
              )
            }
            {expandedLater === nl.number && nl.laterSubscribers.length > 0 &&
              renderSubscriberList(
                '2+ weeks subscribers',
                nl.laterSubscribers,
                () => setExpandedLater(null),
              )
            }
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {newsletters.length === 0 && (
        <div className={styles.empty}>No newsletters found</div>
      )}
    </div>
  );
}
