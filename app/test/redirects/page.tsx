'use client';

import { useState, useEffect, useCallback } from 'react';
import { types } from '@/lib/hd-chart/constants';
import { VALID_PROFILES } from '@/lib/redirect';
import type { RedirectRule } from '@/lib/db';
import styles from './redirects.module.css';

const TYPE_VALUES = types;
const PROPERTY_TYPES = ['type', 'profile'] as const;

type Sample = { email: string; firstName: string };

function getValueOptions(propertyType: string): string[] {
  switch (propertyType) {
    case 'type':
      return [...TYPE_VALUES];
    case 'profile':
      return [...VALID_PROFILES];
    default:
      return [];
  }
}

export default function TestRedirectsPage() {
  const [rules, setRules] = useState<RedirectRule[]>([]);
  const [samplesByType, setSamplesByType] = useState<Record<string, Sample>>({});
  const [samplesByProfile, setSamplesByProfile] = useState<Record<string, Sample>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add-form state
  const [newSlug, setNewSlug] = useState('');
  const [newPropertyType, setNewPropertyType] = useState<string>('type');
  const [newPropertyValue, setNewPropertyValue] = useState<string>('');
  const [newDestinationUrl, setNewDestinationUrl] = useState('');
  const [adding, setAdding] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');

  // Copy-URL feedback
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/redirects');
      if (!response.ok) throw new Error('Failed to load redirect rules');
      const data = await response.json();
      setRules(data.rules);
      setSamplesByType(data.samples.byType);
      setSamplesByProfile(data.samples.byProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlug || !newPropertyType || !newPropertyValue || !newDestinationUrl) return;

    setAdding(true);
    setError('');
    try {
      const response = await fetch('/api/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: newSlug,
          property_type: newPropertyType,
          property_value: newPropertyValue,
          destination_url: newDestinationUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? 'Failed to create rule');
        return;
      }

      await loadRules();
      setNewPropertyValue('');
      setNewDestinationUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (rule: RedirectRule) => {
    setEditingId(rule.id);
    setEditUrl(rule.destination_url);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/redirects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_url: editUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? 'Failed to update rule');
        return;
      }

      const updated = await response.json();
      setRules(prev => prev.map(r => (r.id === id ? updated : r)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditUrl('');
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/redirects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        setError('Failed to delete rule');
        return;
      }

      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Group rules by slug
  const groupedRules = rules.reduce<Record<string, RedirectRule[]>>((acc, rule) => {
    if (!acc[rule.slug]) acc[rule.slug] = [];
    acc[rule.slug].push(rule);
    return acc;
  }, {});

  // Sort each group: specific rules first, default (*) last
  for (const slug of Object.keys(groupedRules)) {
    groupedRules[slug].sort((a, b) => {
      if (a.property_value === '*' && b.property_value !== '*') return 1;
      if (a.property_value !== '*' && b.property_value === '*') return -1;
      return a.property_value.localeCompare(b.property_value);
    });
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading redirect rules...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Redirect Rules</h1>
        <p className={styles.subtitle}>
          {rules.length} rule{rules.length !== 1 ? 's' : ''} across{' '}
          {Object.keys(groupedRules).length} slug{Object.keys(groupedRules).length !== 1 ? 's' : ''}
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {/* Flodesk instructions */}
      <div className={styles.instructions}>
        <p className={styles.instructionsTitle}>Using in Flodesk</p>
        <p className={styles.instructionsText}>
          Create a button or link in your Flodesk email and set the URL to:
        </p>
        <code className={styles.instructionsCode}>
          {'https://livecorrectly.com/r/[slug]?email={{ subscriber.email }}'}
        </code>
        <p className={styles.instructionsText}>
          Replace <code>[slug]</code> with your slug name. Flodesk will substitute the subscriber{"'"}s email automatically.
        </p>
      </div>

      {/* Add-rule form */}
      <form onSubmit={handleAdd} className={styles.addForm}>
        <p className={styles.addFormTitle}>Add rule</p>
        <div className={styles.addFormRow}>
          <div className={styles.formField}>
            <label htmlFor="slug">Slug</label>
            <input
              id="slug"
              type="text"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="e.g. welcome"
              style={{ width: '10rem' }}
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="propertyType">Property</label>
            <select
              id="propertyType"
              value={newPropertyType}
              onChange={(e) => {
                setNewPropertyType(e.target.value);
                setNewPropertyValue('');
              }}
            >
              {PROPERTY_TYPES.map(pt => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          </div>
          <div className={styles.formField}>
            <label htmlFor="propertyValue">Value</label>
            <select
              id="propertyValue"
              value={newPropertyValue}
              onChange={(e) => setNewPropertyValue(e.target.value)}
            >
              <option value="">Select...</option>
              <option value="*">* (default)</option>
              {getValueOptions(newPropertyType).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className={styles.formField} style={{ flex: 1, minWidth: '14rem' }}>
            <label htmlFor="destinationUrl">Destination URL</label>
            <input
              id="destinationUrl"
              type="url"
              value={newDestinationUrl}
              onChange={(e) => setNewDestinationUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <button
            type="submit"
            className={styles.addButton}
            disabled={adding || !newSlug || !newPropertyValue || !newDestinationUrl}
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
        {newSlug && (
          <p className={styles.urlPreview}>
            Redirect URL: <code>{`${window.location.origin}/r/${newSlug}?email=subscriber@example.com`}</code>
          </p>
        )}
      </form>

      {/* Rules grouped by slug */}
      {Object.keys(groupedRules).length === 0 ? (
        <div className={styles.empty}>No redirect rules yet</div>
      ) : (
        Object.entries(groupedRules).map(([slug, slugRules]) => (
          <div key={slug} className={styles.slugGroup}>
            <div className={styles.slugGroupHeader}>
              <div className={styles.slugUrl}>
                <code>{`${window.location.origin}/r/${slug}?email=`}{'{{email}}'}</code>
                <button
                  className={styles.copyButton}
                  title={copiedSlug === slug ? 'Copied!' : 'Copy redirect URL'}
                  onClick={() => {
                    const url = `${window.location.origin}/r/${slug}?email=`;
                    navigator.clipboard.writeText(url).then(() => {
                      setCopiedSlug(slug);
                      setTimeout(() => setCopiedSlug(null), 2000);
                    });
                  }}
                >
                  {copiedSlug === slug ? (
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
            </div>
            <table className={styles.rulesTable}>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Value</th>
                  <th>Destination URL</th>
                  <th style={{ width: '8rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slugRules.map(rule => (
                  <tr
                    key={rule.id}
                    className={rule.property_value === '*' ? styles.defaultRow : undefined}
                  >
                    <td>{rule.property_type}</td>
                    <td>{rule.property_value === '*' ? '* (default)' : rule.property_value}</td>
                    <td className={styles.urlCell}>
                      {editingId === rule.id ? (
                        <input
                          type="url"
                          className={styles.editInput}
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(rule.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span title={rule.destination_url}>{rule.destination_url}</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {editingId === rule.id ? (
                          <>
                            <button
                              className={styles.saveButton}
                              onClick={() => handleSaveEdit(rule.id)}
                            >
                              Save
                            </button>
                            <button
                              className={styles.actionButton}
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={styles.actionButton}
                              onClick={() => handleEdit(rule)}
                            >
                              Edit
                            </button>
                            <button
                              className={styles.deleteButton}
                              onClick={() => handleDelete(rule.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* Test links section */}
      {Object.keys(groupedRules).length > 0 && (Object.keys(samplesByType).length > 0 || Object.keys(samplesByProfile).length > 0) && (
        <div className={styles.testSection}>
          <p className={styles.testSectionTitle}>Test links</p>
          {Object.keys(groupedRules).map(slug => {
            const slugRules = groupedRules[slug];
            const referencedTypes = new Set<string>();
            const referencedProfiles = new Set<string>();
            let hasTypeWildcard = false;
            let hasProfileWildcard = false;
            for (const rule of slugRules) {
              if (rule.property_type === 'type') {
                if (rule.property_value === '*') hasTypeWildcard = true;
                else referencedTypes.add(rule.property_value);
              } else if (rule.property_type === 'profile') {
                if (rule.property_value === '*') hasProfileWildcard = true;
                else referencedProfiles.add(rule.property_value);
              }
            }

            const typeEntries = (hasTypeWildcard
              ? Object.entries(samplesByType)
              : Object.entries(samplesByType).filter(([t]) => referencedTypes.has(t))
            );
            const profileEntries = (hasProfileWildcard
              ? Object.entries(samplesByProfile)
              : Object.entries(samplesByProfile).filter(([p]) => referencedProfiles.has(p))
            );

            if (typeEntries.length === 0 && profileEntries.length === 0) return null;

            return (
              <div key={slug}>
                <div className={styles.testSlugHeading}>/r/{slug}</div>

                {typeEntries.length > 0 && (
                  <>
                    <p className={styles.testGroupLabel}>By type</p>
                    <table className={styles.testTable}>
                      <tbody>
                        {typeEntries.map(([typeName, sample]) => (
                          <tr key={typeName}>
                            <td>{typeName} ({sample.firstName})</td>
                            <td>
                              <a
                                className={styles.testLink}
                                href={`/r/${slug}?email=${encodeURIComponent(sample.email)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                /r/{slug}?email={encodeURIComponent(sample.email)}
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {profileEntries.length > 0 && (
                  <>
                    <p className={styles.testGroupLabel}>By profile</p>
                    <table className={styles.testTable}>
                      <tbody>
                        {profileEntries.map(([profileName, sample]) => (
                          <tr key={profileName}>
                            <td>{profileName} ({sample.firstName})</td>
                            <td>
                              <a
                                className={styles.testLink}
                                href={`/r/${slug}?email=${encodeURIComponent(sample.email)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                /r/{slug}?email={encodeURIComponent(sample.email)}
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
