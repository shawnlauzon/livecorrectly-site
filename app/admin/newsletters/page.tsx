'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  ready: number;
  readySubscribers: ReadySubscriber[];
  schedule: NewsletterSchedule | null;
}

interface NewslettersResponse {
  newsletters: NewsletterInfo[];
}

function getPassword(): string | null {
  return sessionStorage.getItem('adminPassword');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function getStatusLabel(nl: NewsletterInfo): string {
  if (!nl.schedule) return 'Not scheduled';
  if (nl.schedule.status === 'scheduled') return `Scheduled`;
  if (nl.schedule.status === 'sent') return 'Sent';
  if (nl.schedule.status === 'cancelled') return 'Cancelled';
  return nl.schedule.status;
}

export default function AdminNewslettersPage() {
  const router = useRouter();
  const [newsletters, setNewsletters] = useState<NewsletterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('14:00');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [expandedReady, setExpandedReady] = useState<number | null>(null);

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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Fetch on mount — wrapped in a void IIFE so the effect doesn't
    // call the setState-containing function directly (lint: set-state-in-effect).
    void (async () => { await fetchNewsletters(); })();
  }, [fetchNewsletters]);

  const handleSchedule = async (newsletterNumber: number) => {
    const pwd = getPassword();
    if (!pwd) return;

    if (!scheduleDate || !scheduleTime) {
      setActionMessage('Pick a date and time first');
      return;
    }

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (scheduledAt <= new Date()) {
      setActionMessage('Scheduled time must be in the future');
      return;
    }

    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/newsletters/schedule', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newsletterNumber,
          scheduledAt: scheduledAt.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }

      setActionMessage(
        `Scheduled! Broadcast ${data.broadcastId}, ${data.contactCount} contacts at ${formatDateTime(data.scheduledAt)}`,
      );
      setScheduling(null);
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

  // Default schedule date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Newsletters</h1>
        <p className={styles.subtitle}>
          Schedule and manage newsletter broadcasts.{' '}
          <Link href="/admin" style={{ color: 'var(--grape)' }}>
            Back to subscribers
          </Link>
        </p>
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
            <th style={{ width: '5rem', textAlign: 'center' }}>Ready</th>
            <th style={{ width: '10rem' }}>Status</th>
            <th style={{ width: '14rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {newsletters.map((nl) => (
            <React.Fragment key={nl.number}>
            <tr style={{ cursor: 'default', verticalAlign: 'top' }}>
              <td style={{ textAlign: 'center', fontWeight: 600 }}>
                {nl.number}
              </td>
              <td>
                <span style={{ color: 'var(--ink)' }}>{nl.subject}</span>
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
                {nl.ready > 0 ? (
                  <button
                    onClick={() =>
                      setExpandedReady(
                        expandedReady === nl.number ? null : nl.number,
                      )
                    }
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
                    {nl.ready}
                  </button>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>0</span>
                )}
              </td>
              <td>
                <span
                  style={{
                    fontWeight: 600,
                    color:
                      nl.schedule?.status === 'scheduled'
                        ? 'var(--grape)'
                        : nl.schedule?.status === 'sent'
                          ? '#1a7a3a'
                          : nl.schedule?.status === 'cancelled'
                            ? 'var(--coral)'
                            : 'var(--muted)',
                  }}
                >
                  {getStatusLabel(nl)}
                </span>
                {nl.schedule?.status === 'scheduled' && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted)',
                      marginTop: '2px',
                    }}
                  >
                    {formatDateTime(nl.schedule.scheduledAt)}
                    <br />
                    {nl.schedule.subscriberCount} recipients
                  </div>
                )}
                {nl.schedule?.status === 'sent' && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted)',
                      marginTop: '2px',
                    }}
                  >
                    {nl.schedule.subscriberCount} recipients
                  </div>
                )}
              </td>
              <td>
                {/* Schedule button — show if not currently scheduled */}
                {nl.schedule?.status !== 'scheduled' && nl.ready > 0 && (
                  <>
                    {scheduling === nl.number ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.375rem',
                        }}
                      >
                        <input
                          type="date"
                          defaultValue={defaultDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          style={{
                            fontFamily: 'var(--body)',
                            fontSize: '0.8125rem',
                            padding: '4px 6px',
                            border: '1px solid var(--line)',
                            borderRadius: '4px',
                          }}
                        />
                        <input
                          type="time"
                          defaultValue="14:00"
                          onChange={(e) => setScheduleTime(e.target.value)}
                          style={{
                            fontFamily: 'var(--body)',
                            fontSize: '0.8125rem',
                            padding: '4px 6px',
                            border: '1px solid var(--line)',
                            borderRadius: '4px',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            onClick={() => handleSchedule(nl.number)}
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
                            onClick={() => setScheduling(null)}
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
                          setScheduling(nl.number);
                          setScheduleDate(defaultDate);
                          setScheduleTime('14:00');
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

                {/* Cancel button — only when scheduled */}
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
                    Cancel broadcast
                  </button>
                )}

                {/* Preview link */}
                {nl.slug && (
                  <a
                    href={`/newsletter/${nl.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--body)',
                      fontSize: '0.75rem',
                      color: 'var(--grape)',
                      marginLeft: '0.5rem',
                    }}
                  >
                    Preview
                  </a>
                )}
              </td>
            </tr>
            {expandedReady === nl.number && nl.readySubscribers.length > 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 0 }}>
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
                        Ready subscribers
                      </span>
                      <button
                        onClick={() => setExpandedReady(null)}
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
                        {nl.readySubscribers.map((sub) => (
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
            )}
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
