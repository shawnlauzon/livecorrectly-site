'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';

interface Diff {
  field: string;
  expected: string;
  actual: string;
}

interface ContactAuditResult {
  subscriberId: string;
  email: string;
  firstName: string;
  status: 'in_sync' | 'out_of_sync' | 'never_synced' | 'missing_in_resend' | 'error';
  syncedAt?: string;
  diffs: Diff[];
  expectedValues: Record<string, string>;
  errorMessage?: string;
}

interface AuditSummary {
  total: number;
  inSync: number;
  outOfSync: number;
  neverSynced: number;
  missing: number;
  errors: number;
}

interface AuditResponse {
  summary: AuditSummary;
  results: ContactAuditResult[];
  mode: 'local' | 'backfill';
  untrackedEmails?: string[];
}

function getPassword(): string | null {
  return sessionStorage.getItem('adminPassword');
}

export default function AdminContactsPage() {
  const router = useRouter();
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncingAll, setSyncingAll] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const runAudit = useCallback(async (backfill = false) => {
    const pwd = getPassword();
    if (!pwd) {
      router.push('/admin');
      return;
    }

    if (backfill) {
      setBackfilling(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const url = backfill
        ? '/api/admin/contacts/audit?backfill=true'
        : '/api/admin/contacts/audit';
      const res = await fetch(url, {
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
      const data: AuditResponse = await res.json();
      setAuditData(data);
      if (backfill) {
        const msg = data.untrackedEmails && data.untrackedEmails.length > 0
          ? `Backfill complete. ${data.untrackedEmails.length} untracked contact(s) in Resend.`
          : 'Backfill complete. Sync state populated from Resend.';
        setActionMessage(msg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setBackfilling(false);
    }
  }, [router]);

  useEffect(() => {
    void (async () => { await runAudit(); })();
  }, [runAudit]);

  const handleSync = async (subscriberIds: string[]) => {
    const pwd = getPassword();
    if (!pwd) return;

    const isAll = subscriberIds.length === 0;
    if (isAll) {
      setSyncingAll(true);
    } else {
      setSyncingIds(prev => {
        const next = new Set(prev);
        subscriberIds.forEach(id => next.add(id));
        return next;
      });
    }
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/contacts/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(isAll ? { all: true } : { subscriberIds }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }

      setActionMessage(
        `Synced ${data.synced}/${data.total} contacts${data.errors ? ` (${data.errors.length} errors)` : ''}`,
      );

      // Update synced contacts in place — no full page reload
      const syncedSet = new Set(subscriberIds);
      setAuditData(prev => {
        if (!prev) return prev;
        const updatedResults = prev.results.map(r => {
          if (!syncedSet.has(r.subscriberId)) return r;
          // Mark as in_sync, clear diffs, set syncedAt to now
          return {
            ...r,
            status: 'in_sync' as const,
            diffs: [],
            syncedAt: new Date().toISOString(),
          };
        });
        // Recompute summary from updated results
        const summary = {
          total: updatedResults.length,
          inSync: updatedResults.filter(r => r.status === 'in_sync').length,
          outOfSync: updatedResults.filter(r => r.status === 'out_of_sync').length,
          neverSynced: updatedResults.filter(r => r.status === 'never_synced').length,
          missing: updatedResults.filter(r => r.status === 'missing_in_resend').length,
          errors: updatedResults.filter(r => r.status === 'error').length,
        };
        return { ...prev, results: updatedResults, summary };
      });
      // Keep expanded row open so the user sees the updated state
    } catch (err) {
      setActionMessage(
        `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    } finally {
      setSyncingAll(false);
      setSyncingIds(new Set());
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading contacts...</p>
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

  if (!auditData) return null;

  const { summary, results } = auditData;

  const needsSyncIds = results
    .filter(r => r.status === 'out_of_sync' || r.status === 'never_synced' || r.status === 'missing_in_resend')
    .map(r => r.subscriberId);

  // Filter results based on selected stat card
  const filteredResults = filter
    ? results.filter(r => r.status === filter)
    : results;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Contact Sync</h1>
        <p className={styles.subtitle}>
          {auditData.mode === 'local'
            ? 'Local sync state vs. expected values.'
            : 'Resend contacts vs. Neon subscribers.'}{' '}
          <Link href="/admin" style={{ color: 'var(--grape)' }}>
            Back to subscribers
          </Link>
          {' \u00b7 '}
          <Link href="/admin/newsletters" style={{ color: 'var(--grape)' }}>
            Newsletters
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

      {/* Untracked contacts from backfill */}
      {auditData.untrackedEmails && auditData.untrackedEmails.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            background: '#FFF8E6',
            color: '#A67C00',
            fontFamily: 'var(--body)',
            fontSize: '0.8125rem',
          }}
        >
          <strong>Untracked in Resend</strong> (no Neon subscriber):{' '}
          {auditData.untrackedEmails.join(', ')}
        </div>
      )}

      {/* Summary stats */}
      <div className={styles.statsGrid}>
        <button
          className={`${styles.statCard} ${filter === null ? styles.statCardActive : ''}`}
          onClick={() => setFilter(null)}
        >
          <div className={styles.statValue}>{summary.total}</div>
          <div className={styles.statLabel}>Total</div>
        </button>
        <button
          className={`${styles.statCard} ${filter === 'in_sync' ? styles.statCardActive : ''}`}
          onClick={() => setFilter(filter === 'in_sync' ? null : 'in_sync')}
        >
          <div className={styles.statValue} style={{ color: '#1a7a3a' }}>
            {summary.inSync}
          </div>
          <div className={styles.statLabel}>In sync</div>
        </button>
        <button
          className={`${styles.statCard} ${filter === 'out_of_sync' ? styles.statCardActive : ''}`}
          onClick={() => setFilter(filter === 'out_of_sync' ? null : 'out_of_sync')}
        >
          <div className={styles.statValue} style={{ color: 'var(--marigold)' }}>
            {summary.outOfSync}
          </div>
          <div className={styles.statLabel}>Out of sync</div>
        </button>
        {summary.neverSynced > 0 && (
          <button
            className={`${styles.statCard} ${filter === 'never_synced' ? styles.statCardActive : ''}`}
            onClick={() => setFilter(filter === 'never_synced' ? null : 'never_synced')}
          >
            <div className={styles.statValue} style={{ color: 'var(--muted)' }}>
              {summary.neverSynced}
            </div>
            <div className={styles.statLabel}>Never synced</div>
          </button>
        )}
        {summary.missing > 0 && (
          <button
            className={`${styles.statCard} ${filter === 'missing_in_resend' ? styles.statCardActive : ''}`}
            onClick={() => setFilter(filter === 'missing_in_resend' ? null : 'missing_in_resend')}
          >
            <div className={styles.statValue} style={{ color: 'var(--coral)' }}>
              {summary.missing}
            </div>
            <div className={styles.statLabel}>Missing</div>
          </button>
        )}
        {summary.errors > 0 && (
          <button
            className={`${styles.statCard} ${filter === 'error' ? styles.statCardActive : ''}`}
            onClick={() => setFilter(filter === 'error' ? null : 'error')}
          >
            <div className={styles.statValue} style={{ color: 'var(--coral)' }}>
              {summary.errors}
            </div>
            <div className={styles.statLabel}>Errors</div>
          </button>
        )}
      </div>

      {/* Actions bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {needsSyncIds.length > 0 && (
          <button
            onClick={() => handleSync(needsSyncIds)}
            disabled={syncingAll || backfilling}
            style={{
              fontFamily: 'var(--body)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              padding: '6px 14px',
              background: 'var(--grape)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: syncingAll || backfilling ? 'wait' : 'pointer',
              opacity: syncingAll || backfilling ? 0.6 : 1,
            }}
          >
            {syncingAll ? 'Syncing...' : `Sync ${needsSyncIds.length} out-of-sync`}
          </button>
        )}
        <button
          onClick={() => void runAudit()}
          disabled={loading || backfilling}
          style={{
            fontFamily: 'var(--body)',
            fontSize: '0.8125rem',
            padding: '6px 14px',
            background: 'none',
            color: 'var(--grape)',
            border: '1px solid var(--grape)',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
        <button
          onClick={() => void runAudit(true)}
          disabled={backfilling || syncingAll}
          style={{
            fontFamily: 'var(--body)',
            fontSize: '0.8125rem',
            padding: '6px 14px',
            background: 'none',
            color: 'var(--muted)',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            cursor: backfilling || syncingAll ? 'wait' : 'pointer',
            opacity: backfilling ? 0.6 : 1,
          }}
        >
          {backfilling ? 'Backfilling...' : 'Backfill from Resend'}
        </button>
      </div>

      {/* Contacts table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th style={{ width: '8rem', textAlign: 'center' }}>Status</th>
            <th style={{ width: '5rem', textAlign: 'center' }}>Diffs</th>
            <th style={{ width: '6rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredResults.map(contact => (
            <React.Fragment key={contact.subscriberId}>
              <tr
                style={{
                  cursor: 'pointer',
                  verticalAlign: 'top',
                }}
                onClick={() => {
                  setExpandedId(
                    expandedId === contact.subscriberId
                      ? null
                      : contact.subscriberId,
                  );
                }}
              >
                <td style={{ color: 'var(--ink)' }}>{contact.email}</td>
                <td>{contact.firstName}</td>
                <td style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '3px',
                      background:
                        contact.status === 'in_sync'
                          ? '#E6F9ED'
                          : contact.status === 'out_of_sync'
                            ? '#FFF8E6'
                            : contact.status === 'never_synced'
                              ? '#F3F0FF'
                              : '#FFF0EE',
                      color:
                        contact.status === 'in_sync'
                          ? '#1a7a3a'
                          : contact.status === 'out_of_sync'
                            ? '#A67C00'
                            : contact.status === 'never_synced'
                              ? 'var(--grape)'
                              : 'var(--coral)',
                    }}
                  >
                    {contact.status === 'in_sync'
                      ? 'In sync'
                      : contact.status === 'out_of_sync'
                        ? 'Out of sync'
                        : contact.status === 'never_synced'
                          ? 'Never synced'
                          : contact.status === 'missing_in_resend'
                            ? 'Missing'
                            : 'Error'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {contact.diffs.length > 0 ? (
                    <span style={{ color: 'var(--grape)', fontWeight: 600 }}>
                      {contact.diffs.length}
                    </span>
                  ) : contact.status === 'never_synced' || contact.status === 'missing_in_resend' ? (
                    <span style={{ color: 'var(--muted)' }}>&mdash;</span>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>0</span>
                  )}
                </td>
                <td>
                  {(contact.status === 'out_of_sync' ||
                    contact.status === 'never_synced' ||
                    contact.status === 'missing_in_resend') && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        void handleSync([contact.subscriberId]);
                      }}
                      disabled={syncingIds.has(contact.subscriberId) || syncingAll}
                      style={{
                        fontFamily: 'var(--body)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '3px 10px',
                        background: 'var(--grape)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor:
                          syncingIds.has(contact.subscriberId) || syncingAll
                            ? 'wait'
                            : 'pointer',
                        opacity:
                          syncingIds.has(contact.subscriberId) || syncingAll
                            ? 0.6
                            : 1,
                      }}
                    >
                      {syncingIds.has(contact.subscriberId) ? 'Syncing...' : 'Sync'}
                    </button>
                  )}
                </td>
              </tr>
              {expandedId === contact.subscriberId && (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <div
                      style={{
                        background: 'var(--paper)',
                        padding: '0.5rem 1rem',
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      {contact.diffs.length > 0 ? (
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontFamily: 'var(--body)',
                            fontSize: '0.8125rem',
                          }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{
                                  textAlign: 'left',
                                  fontWeight: 600,
                                  color: 'var(--muted)',
                                  fontSize: '0.6875rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  padding: '0.25rem 0.5rem',
                                }}
                              >
                                Field
                              </th>
                              <th
                                style={{
                                  textAlign: 'left',
                                  fontWeight: 600,
                                  color: 'var(--muted)',
                                  fontSize: '0.6875rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  padding: '0.25rem 0.5rem',
                                }}
                              >
                                Expected
                              </th>
                              <th
                                style={{
                                  textAlign: 'left',
                                  fontWeight: 600,
                                  color: 'var(--muted)',
                                  fontSize: '0.6875rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  padding: '0.25rem 0.5rem',
                                }}
                              >
                                Synced
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {contact.diffs.map(diff => (
                              <tr key={diff.field}>
                                <td
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    fontWeight: 500,
                                    color: 'var(--ink)',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {diff.field}
                                </td>
                                <td
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    color: '#1a7a3a',
                                  }}
                                >
                                  {diff.expected || '(empty)'}
                                </td>
                                <td
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    color: 'var(--coral)',
                                  }}
                                >
                                  {diff.actual || '(empty)'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <>
                          {contact.syncedAt && (
                            <div
                              style={{
                                fontFamily: 'var(--body)',
                                fontSize: '0.75rem',
                                color: 'var(--muted)',
                                marginBottom: '0.375rem',
                              }}
                            >
                              Last synced {new Date(contact.syncedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontFamily: 'var(--body)',
                              fontSize: '0.8125rem',
                            }}
                          >
                            <thead>
                              <tr>
                                <th
                                  style={{
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    color: 'var(--muted)',
                                    fontSize: '0.6875rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    padding: '0.25rem 0.5rem',
                                  }}
                                >
                                  Field
                                </th>
                                <th
                                  style={{
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    color: 'var(--muted)',
                                    fontSize: '0.6875rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    padding: '0.25rem 0.5rem',
                                  }}
                                >
                                  Value
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(contact.expectedValues).map(([key, value]) => (
                                <tr key={key}>
                                  <td
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      fontWeight: 500,
                                      color: 'var(--ink)',
                                      fontFamily: 'monospace',
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {key}
                                  </td>
                                  <td
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      color: '#1a7a3a',
                                    }}
                                  >
                                    {value || '(empty)'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {filteredResults.length === 0 && (
        <div className={styles.empty}>
          {filter ? 'No contacts match this filter' : 'No active contacts found'}
        </div>
      )}
    </div>
  );
}
