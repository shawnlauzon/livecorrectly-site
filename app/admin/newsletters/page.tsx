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
  sentCount: number;
  nextWeekCount: number;
  laterCount: number;
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
    void (async () => { await fetchNewsletters(); })();
  }, [fetchNewsletters]);

  const handleSchedule = async (newsletterNumber: number) => {
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
        body: JSON.stringify({ newsletterNumber }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }

      setActionMessage(
        `Scheduled! Broadcast ${data.broadcastId}, ${data.contactCount} contacts for ${formatDateTime(data.scheduledAt)}`,
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
        <td colSpan={6} style={{ padding: 0 }}>
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
            <th style={{ width: '14rem' }}>Actions</th>
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
              <td>
                <div
                  style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Scheduled/unscheduled status badge */}
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '3px',
                      background: nl.schedule?.status === 'scheduled'
                        ? '#E6F9ED'
                        : nl.schedule?.status === 'sent'
                          ? 'var(--paper)'
                          : '#FFF8E6',
                      color: nl.schedule?.status === 'scheduled'
                        ? '#1a7a3a'
                        : nl.schedule?.status === 'sent'
                          ? 'var(--muted)'
                          : '#A67C00',
                    }}
                  >
                    {nl.schedule?.status === 'scheduled'
                      ? 'Scheduled'
                      : nl.schedule?.status === 'sent'
                        ? 'Sent'
                        : 'Unscheduled'}
                  </span>

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

                  {/* Scheduled time info */}
                  {nl.schedule?.status === 'scheduled' && (
                    <span
                      style={{
                        fontFamily: 'var(--body)',
                        fontSize: '0.6875rem',
                        color: 'var(--muted)',
                      }}
                    >
                      {formatDateTime(nl.schedule.scheduledAt)}
                    </span>
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
