'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../../admin.module.css';
import type { ScheduleStepId, ScheduleEvent, ScheduleCompleteEvent } from '@/lib/types/schedule-progress';

/** All pipeline steps in display order. */
const SCHEDULE_STEPS: { id: ScheduleStepId; label: string }[] = [
  { id: 'load', label: 'Loading newsletter content' },
  { id: 'subscribers', label: 'Finding subscribers' },
  { id: 'contact-properties', label: 'Syncing contact properties' },
  { id: 'templates', label: 'Rendering templates' },
  { id: 'render-broadcast', label: 'Rendering broadcast' },
  { id: 'segment', label: 'Creating segment' },
  { id: 'segment-contacts', label: 'Adding contacts to segment' },
  { id: 'broadcast', label: 'Creating broadcast' },
  { id: 'records', label: 'Recording schedule' },
];

interface ProgressStepState {
  id: ScheduleStepId;
  label: string;
  status: 'pending' | 'in-progress' | 'done' | 'error';
  detail?: string;
  current?: number;
  total?: number;
}

interface ScheduleProgress {
  newsletterNumber: number;
  isTest?: boolean;
  steps: ProgressStepState[];
  result?: ScheduleCompleteEvent['result'];
  error?: string;
  done: boolean;
}

interface NewsletterSchedule {
  id: number;
  kind: 'broadcast' | 'direct';
  broadcastId: string | null;
  scheduledAt: string;
  subscriberCount: number;
}

interface ReadySubscriber {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
}

interface SegmentInfo {
  id: number;
  name: string;
  nextIssue: number;
}

interface NewsletterInfo {
  number: number;
  subject: string;
  slug: string | null;

  /** People actually sent this issue */
  receivedCount: number;
  /** Most recent completed send */
  lastSentAt: string | null;
  /** Who Schedule would send to now: active subscribers whose next_step is this issue */
  dueCount: number;
  dueSubscribers: ReadySubscriber[];
  segments: SegmentInfo[];
  /** The pending send, if one is scheduled */
  schedule: NewsletterSchedule | null;
}

/** A note shown above the issue body of any newsletter sent on `sendDate`. */
interface NewsletterNote {
  id: number;
  /** "YYYY-MM-DD" in the publication's timezone */
  sendDate: string;
  body: string;
}

interface NewsletterSettings {
  sendWeekday: number | null;
  sendTime: string | null;
  timezone: string;
  nextRegularSendAt: string | null;
}

interface NewslettersResponse {
  newsletters: NewsletterInfo[];
  segments: SegmentInfo[];
  settings: NewsletterSettings | null;
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

/** Format a "YYYY-MM-DD" note date (e.g. "Wed, Oct 8, 2026") without a timezone shift. */
function formatNoteDate(sendDate: string): string {
  const [year, month, day] = sendDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Weekday options for the weekly cadence (0 = Sunday, matching the DB). */
const WEEKDAY_OPTIONS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

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

export default function AdminNewsletterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [newsletters, setNewsletters] = useState<NewsletterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [expandedReady, setExpandedReady] = useState<number | null>(null);
  const [confirmSchedule, setConfirmSchedule] = useState<number | null>(null);
  const [scheduleMode, setScheduleMode] = useState<'choose' | 'custom'>('choose');
  const [customSendAt, setCustomSendAt] = useState<string>('');
  const [customTimezone, setCustomTimezone] = useState<string>('America/Chicago');
  const [scheduleProgress, setScheduleProgress] = useState<ScheduleProgress | null>(null);

  // Segment management
  const [segmentName, setSegmentName] = useState<string>('');
  const [creatingSegment, setCreatingSegment] = useState<number | null>(null);
  const [deletingSegment, setDeletingSegment] = useState<number | null>(null);

  // Segment contacts (lazy-loaded from Resend)
  const [segmentContacts, setSegmentContacts] = useState<Record<number, { email: string; firstName: string; lastName: string | null }[]>>({});
  const [loadingSegmentContacts, setLoadingSegmentContacts] = useState<number | null>(null);

  // Cadence controls (initialized from server settings)
  const [sendWeekday, setSendWeekday] = useState<number | null>(null);
  const [sendTime, setSendTime] = useState<string>('');
  // Derived server-side from the saved cadence; refreshed on every list fetch
  const [nextRegularSendAt, setNextRegularSendAt] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>('America/Chicago');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Dated notes, newest first
  const [notes, setNotes] = useState<NewsletterNote[]>([]);
  // Note form: editing an existing note (id) or adding a new one (null)
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteDate, setNoteDate] = useState<string>('');
  const [noteBody, setNoteBody] = useState<string>('');
  const [savingNote, setSavingNote] = useState(false);

  // Newsletter number awaiting inline delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

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

      setNextRegularSendAt(data.settings?.nextRegularSendAt ?? null);

      // Initialize cadence controls from persisted settings (once)
      if (!settingsLoaded && data.settings) {
        setSendWeekday(data.settings.sendWeekday);
        setSendTime(data.settings.sendTime ?? '');
        setTimezone(data.settings.timezone);
        setSettingsLoaded(true);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [router, settingsLoaded]);

  const fetchNotes = useCallback(async () => {
    const pwd = getPassword();
    if (!pwd) return;
    try {
      const res = await fetch('/api/admin/newsletters/notes', {
        headers: { Authorization: `Bearer ${pwd}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }
      setNotes(data.notes);
    } catch (err) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : 'Failed to load notes'}`);
    }
  }, []);

  useEffect(() => {
    void (async () => { await fetchNewsletters(); })();
  }, [fetchNewsletters]);

  useEffect(() => {
    void (async () => { await fetchNotes(); })();
  }, [fetchNotes]);

  /** The note that a send at `iso` would include (matched by day in the publication timezone). */
  function noteForSendAt(iso: string | null): NewsletterNote | null {
    if (!iso) return null;
    const day = toDatetimeLocal(iso, timezone).slice(0, 10);
    return notes.find(n => n.sendDate === day) ?? null;
  }

  const openNoteForm = (note: NewsletterNote | null) => {
    setEditingNoteId(note?.id ?? null);
    // New notes default to the next regular send day
    setNoteDate(note?.sendDate ?? (nextRegularSendAt ? toDatetimeLocal(nextRegularSendAt, timezone).slice(0, 10) : ''));
    setNoteBody(note?.body ?? '');
    setNoteFormOpen(true);
    setActionMessage(null);
  };

  const handleSaveNote = async () => {
    const pwd = getPassword();
    if (!pwd) return;

    setSavingNote(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/newsletters/notes', {
        method: editingNoteId === null ? 'POST' : 'PUT',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(editingNoteId !== null && { id: editingNoteId }),
          sendDate: noteDate,
          body: noteBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }
      setNoteFormOpen(false);
      setActionMessage('Note saved.');
      await fetchNotes();
    } catch (err) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (note: NewsletterNote) => {
    const pwd = getPassword();
    if (!pwd) return;

    if (!confirm(`Delete the note for ${formatNoteDate(note.sendDate)}?`)) {
      return;
    }

    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/newsletters/notes', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: note.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }
      if (editingNoteId === note.id) setNoteFormOpen(false);
      setActionMessage('Note deleted.');
      await fetchNotes();
    } catch (err) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  const handleSchedule = async (
    newsletterNumber: number,
    sendAt?: string | null,
    options?: { test?: boolean; confirmMerge?: boolean },
  ): Promise<void> => {
    const pwd = getPassword();
    if (!pwd) return;

    const isTest = !!options?.test;

    setActionLoading(true);
    setActionMessage(null);
    setConfirmSchedule(null);

    // Initialize progress modal with all steps pending
    const initialProgress: ScheduleProgress = {
      newsletterNumber,
      isTest,
      steps: SCHEDULE_STEPS.map(s => ({ ...s, status: 'pending' as const })),
      done: false,
    };
    setScheduleProgress(initialProgress);

    try {
      const res = await fetch('/api/admin/newsletters/schedule', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newsletterNumber,
          ...(sendAt && { sendAt }),
          ...(isTest && { test: true }),
          ...(options?.confirmMerge && { confirmMerge: true }),
        }),
      });

      const contentType = res.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        // Pre-stream validation error — standard JSON response
        const data = await res.json();
        if (data.needsMergeConfirmation) {
          const merging = (data.merge as string[]).join(', ');
          if (confirm(
            `Several segments are on #${newsletterNumber}. "${merging}" will be merged into "${data.keep}" ` +
            `(the merged segments are deleted), then #${newsletterNumber} is scheduled to "${data.keep}". Continue?`,
          )) {
            setActionLoading(false);
            return handleSchedule(newsletterNumber, sendAt, { ...options, confirmMerge: true });
          }
          setScheduleProgress(null);
          return;
        }
        setScheduleProgress(prev => prev ? {
          ...prev,
          error: data.error ?? 'Unknown error',
          done: true,
        } : null);
        return;
      }

      // NDJSON stream
      const reader = res.body?.getReader();
      if (!reader) {
        setScheduleProgress(prev => prev ? {
          ...prev,
          error: 'No response body',
          done: true,
        } : null);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last (possibly incomplete) line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: ScheduleEvent;
          try {
            event = JSON.parse(line);
          } catch {
            console.warn('[schedule] Failed to parse NDJSON line:', line);
            continue;
          }
          handleProgressEvent(event);
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          handleProgressEvent(JSON.parse(buffer));
        } catch {
          // Incomplete trailing data — ignore
        }
      }

      // Refresh the newsletter table
      await fetchNewsletters();
    } catch (err) {
      setScheduleProgress(prev => prev ? {
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error',
        done: true,
      } : null);
    } finally {
      setActionLoading(false);
    }
  };

  /** Map each incoming NDJSON event to a progress state update. */
  function handleProgressEvent(event: ScheduleEvent) {
    setScheduleProgress(prev => {
      if (!prev) return null;

      if (event.step === 'complete') {
        return { ...prev, result: event.result, done: true };
      }

      if (event.step === 'error') {
        const steps = prev.steps.map(s =>
          s.id === event.failedStep
            ? { ...s, status: 'error' as const }
            : s
        );
        return { ...prev, steps, error: event.error, done: true };
      }

      // Progress event for a pipeline step
      const steps = prev.steps.map(s => {
        if (s.id !== event.step) return s;
        switch (event.status) {
          case 'start':
            return { ...s, label: event.label, status: 'in-progress' as const };
          case 'progress':
            return {
              ...s,
              label: event.label,
              status: 'in-progress' as const,
              current: event.current,
              total: event.total,
            };
          case 'done':
            return {
              ...s,
              label: event.label,
              status: 'done' as const,
              detail: event.detail,
              current: undefined,
              total: undefined,
            };
          default:
            return s;
        }
      });
      return { ...prev, steps };
    });
  }

  const handleCancel = async (newsletterNumber: number) => {
    const pwd = getPassword();
    if (!pwd) return;

    if (!confirm(`Unschedule newsletter #${newsletterNumber}?`)) {
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

      setActionMessage(`Newsletter #${newsletterNumber} unscheduled.`);
      await fetchNewsletters();
    } catch (err) {
      setActionMessage(
        `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateIssue = async () => {
    const pwd = getPassword();
    if (!pwd) return;

    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/newsletters', {
        method: 'POST',
        headers: { Authorization: `Bearer ${pwd}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }
      router.push(`/admin/newsletters/${id}/${data.number}`);
    } catch (err) {
      setActionMessage(
        `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteIssue = async (newsletterNumber: number) => {
    const pwd = getPassword();
    if (!pwd) return;

    setActionLoading(true);
    setActionMessage(null);
    setConfirmDelete(null);

    try {
      const res = await fetch(`/api/admin/newsletters/${newsletterNumber}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${pwd}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }

      setActionMessage(`Newsletter #${newsletterNumber} deleted.`);
      await fetchNewsletters();
    } catch (err) {
      setActionMessage(
        `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    const pwd = getPassword();
    if (!pwd) return;

    setSavingSettings(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/newsletters/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(sendWeekday !== null && { sendWeekday }),
          ...(sendTime && { sendTime }),
          timezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }

      setSettingsDirty(false);
      setActionMessage('Settings saved.');
      await fetchNewsletters();
    } catch (err) {
      setActionMessage(
        `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    } finally {
      setSavingSettings(false);
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

  const handleCreateSegment = async (newsletterNumber: number) => {
    const pwd = getPassword();
    if (!pwd || !segmentName.trim()) return;

    setCreatingSegment(newsletterNumber);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/newsletters/segment', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newsletterNumber,
          segmentName: segmentName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }

      setActionMessage(
        `Segment "${data.segmentName}" created with ${data.contactCount} contacts.`,
      );
      setSegmentName('');
      await fetchNewsletters();
    } catch (err) {
      setActionMessage(
        `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    } finally {
      setCreatingSegment(null);
    }
  };

  const handleDeleteSegment = async (segId: number) => {
    const pwd = getPassword();
    if (!pwd) return;

    if (!confirm('Remove this segment? The Resend segment will also be deleted.')) {
      return;
    }

    setDeletingSegment(segId);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/newsletters/segment', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ segmentId: segId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`);
        return;
      }

      setActionMessage('Segment removed.');
      await fetchNewsletters();
    } catch (err) {
      setActionMessage(
        `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    } finally {
      setDeletingSegment(null);
    }
  };

  const fetchSegmentContacts = async (segId: number) => {
    const pwd = getPassword();
    if (!pwd) return;

    // Skip if already loaded
    if (segmentContacts[segId]) return;

    setLoadingSegmentContacts(segId);
    try {
      const res = await fetch(`/api/admin/newsletters/segment/contacts?segmentId=${segId}`, {
        headers: { Authorization: `Bearer ${pwd}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setActionMessage(`Error: ${data.error}`);
        return;
      }
      const data = await res.json();
      setSegmentContacts(prev => ({ ...prev, [segId]: data.contacts }));
    } catch (err) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setLoadingSegmentContacts(null);
    }
  };

  /** Render an expanded subscriber list row. */
  function renderSubscriberList(
    label: string,
    subscribers: ReadySubscriber[],
    onClose: () => void,
    nl?: NewsletterInfo,
    options?: { hideCreateForm?: boolean },
  ) {
    return (
      <tr>
        <td colSpan={7} style={{ padding: 0 }}>
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

            {/* Segment management — only for "Next" subscriber list */}
            {nl && (
              <div
                style={{
                  marginTop: '0.5rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--line)',
                }}
              >
                {/* Existing segments for this issue */}
                {nl.segments.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--body)',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: 'var(--muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Segments
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.25rem' }}>
                      {nl.segments.map(seg => (
                        <div
                          key={seg.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '3px',
                              background: '#EDE9FE',
                              color: 'var(--grape)',
                            }}
                          >
                            {seg.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSegment(seg.id);
                            }}
                            disabled={deletingSegment === seg.id}
                            style={{
                              fontFamily: 'var(--body)',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              background: 'none',
                              border: '1px solid var(--coral)',
                              borderRadius: '4px',
                              cursor: deletingSegment === seg.id ? 'wait' : 'pointer',
                              color: 'var(--coral)',
                              opacity: deletingSegment === seg.id ? 0.5 : 1,
                            }}
                          >
                            {deletingSegment === seg.id ? 'Deleting...' : 'Delete segment'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create new segment — hidden when one already exists */}
                {!options?.hideCreateForm && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <input
                      type="text"
                      value={segmentName}
                      onChange={(e) => setSegmentName(e.target.value)}
                      placeholder="Segment name"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontFamily: 'var(--body)',
                        fontSize: '0.75rem',
                        color: 'var(--ink)',
                        padding: '3px 8px',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        background: '#fff',
                        width: '10rem',
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateSegment(nl.number);
                      }}
                      disabled={creatingSegment === nl.number || !segmentName.trim()}
                      style={{
                        fontFamily: 'var(--body)',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '3px 10px',
                        background: segmentName.trim() ? 'var(--grape-deep)' : 'var(--line)',
                        color: segmentName.trim() ? '#fff' : 'var(--muted)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: creatingSegment === nl.number || !segmentName.trim() ? 'default' : 'pointer',
                        opacity: creatingSegment === nl.number ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {creatingSegment === nl.number ? 'Creating...' : 'Create Segment'}
                    </button>
                  </div>
                )}
              </div>
            )}
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
          Send every
          <select
            value={sendWeekday ?? ''}
            onChange={(e) => { setSendWeekday(e.target.value === '' ? null : Number(e.target.value)); setSettingsDirty(true); }}
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
            {sendWeekday === null && <option value="">Choose a day</option>}
            {WEEKDAY_OPTIONS.map((label, i) => (
              <option key={i} value={i}>{label}</option>
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
          At
          <input
            type="time"
            value={sendTime}
            onChange={(e) => { setSendTime(e.target.value); setSettingsDirty(true); }}
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
          Timezone
          <select
            value={timezone}
            onChange={(e) => { setTimezone(e.target.value); setSettingsDirty(true); }}
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
        <button
          onClick={handleSaveSettings}
          disabled={savingSettings || !settingsDirty}
          style={{
            fontFamily: 'var(--body)',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '6px 16px',
            background: settingsDirty ? 'var(--grape)' : 'var(--line)',
            color: settingsDirty ? '#fff' : 'var(--muted)',
            border: 'none',
            borderRadius: '4px',
            cursor: settingsDirty && !savingSettings ? 'pointer' : 'default',
            opacity: savingSettings ? 0.6 : 1,
            marginLeft: 0,
          }}
        >
          {savingSettings ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Dated notes — shown above the issue body of any newsletter sent on that day */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: 'var(--card)',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <span
            style={{
              fontFamily: 'var(--body)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
            title="A note is shown above the issue in every newsletter sent on its date"
          >
            Notes
          </span>
          {!noteFormOpen && (
            <button
              onClick={() => openNoteForm(null)}
              style={{
                fontFamily: 'var(--body)',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '4px 12px',
                background: 'none',
                color: 'var(--grape)',
                border: '1px solid var(--grape)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              New note
            </button>
          )}
        </div>

        {noteFormOpen && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              padding: '0.5rem',
              background: 'var(--paper)',
              borderRadius: '6px',
            }}
          >
            <label
              style={{
                fontFamily: 'var(--body)',
                fontSize: '0.75rem',
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              Include in newsletters sent on
              <input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                style={{
                  fontFamily: 'var(--body)',
                  fontSize: '0.875rem',
                  color: 'var(--ink)',
                  padding: '0.25rem 0.5rem',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  background: '#fff',
                }}
              />
            </label>
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={3}
              placeholder="Shown above the issue. Blank line = new paragraph."
              style={{
                fontFamily: 'var(--body)',
                fontSize: '0.875rem',
                color: 'var(--ink)',
                padding: '0.5rem',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                background: '#fff',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                onClick={handleSaveNote}
                disabled={savingNote || !noteDate || !noteBody.trim()}
                style={{
                  fontFamily: 'var(--body)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 12px',
                  background: noteDate && noteBody.trim() ? 'var(--grape)' : 'var(--line)',
                  color: noteDate && noteBody.trim() ? '#fff' : 'var(--muted)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: savingNote || !noteDate || !noteBody.trim() ? 'default' : 'pointer',
                  opacity: savingNote ? 0.6 : 1,
                }}
              >
                {savingNote ? 'Saving...' : 'Save note'}
              </button>
              <button
                onClick={() => setNoteFormOpen(false)}
                style={{
                  fontFamily: 'var(--body)',
                  fontSize: '0.75rem',
                  padding: '4px 12px',
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
        )}

        {notes.length === 0 && !noteFormOpen && (
          <span style={{ fontFamily: 'var(--body)', fontSize: '0.8125rem', color: 'var(--muted)' }}>
            No notes yet
          </span>
        )}

        {notes.map(note => (
          <div
            key={note.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              fontFamily: 'var(--body)',
              fontSize: '0.8125rem',
              opacity: note.sendDate < toDatetimeLocal(new Date().toISOString(), timezone).slice(0, 10) ? 0.6 : 1,
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', width: '9rem', flexShrink: 0 }}>
              {formatNoteDate(note.sendDate)}
            </span>
            <span style={{ flex: 1, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{note.body}</span>
            <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
              <button
                onClick={() => openNoteForm(note)}
                style={{
                  fontFamily: 'var(--body)',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  background: 'none',
                  border: '1px solid var(--grape)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--grape)',
                }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteNote(note)}
                style={{
                  fontFamily: 'var(--body)',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  background: 'none',
                  border: '1px solid var(--coral)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--coral)',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
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

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
        <button
          onClick={handleCreateIssue}
          disabled={actionLoading}
          style={{
            fontFamily: 'var(--body)',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '6px 16px',
            background: 'var(--grape)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: actionLoading ? 'wait' : 'pointer',
            opacity: actionLoading ? 0.6 : 1,
          }}
        >
          New issue
        </button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '3rem', textAlign: 'center' }}>#</th>
            <th>Subject</th>
            <th style={{ width: '5.5rem', textAlign: 'center' }}>Received</th>
            <th style={{ textAlign: 'center' }}>Next</th>
            <th style={{ width: '13rem', textAlign: 'center' }}>Status</th>
            <th style={{ width: '10rem' }}>Last sent</th>
            <th style={{ width: '18rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {newsletters.map((nl) => (
            <React.Fragment key={nl.number}>
            <tr
              style={{
                cursor: expandedReady === nl.number ? 'pointer' : 'default',
                verticalAlign: 'top',
              }}
              onClick={() => {
                if (expandedReady === nl.number) setExpandedReady(null);
              }}
            >
              <td style={{ textAlign: 'center', fontWeight: 600 }}>
                {nl.number}
              </td>
              <td>
                <Link
                  href={`/admin/newsletters/${id}/${nl.number}`}
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
              </td>
              <td style={{ textAlign: 'center' }}>
                {nl.receivedCount > 0 ? (
                  <span style={{ color: '#1a7a3a', fontWeight: 600 }}>
                    {nl.receivedCount}
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>0</span>
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                {nl.segments.length > 0 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const expanding = expandedReady !== nl.number;
                      setExpandedReady(expanding ? nl.number : null);
                      if (expanding) {
                        fetchSegmentContacts(nl.segments[0].id);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--body)',
                      fontSize: '0.75rem',
                      color: 'var(--grape)',
                      fontWeight: 600,
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                      padding: 0,
                      whiteSpace: 'nowrap',
                    }}
                    title={`${nl.segments[0].name}: ${nl.dueCount} due for #${nl.number}`}
                  >
                    {nl.segments[0].name} ({nl.dueCount})
                  </button>
                ) : (
                  renderSubscriberCount(
                    nl.dueCount,
                    expandedReady === nl.number,
                    () => setExpandedReady(expandedReady === nl.number ? null : nl.number),
                  )
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                {nl.schedule ? (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '3px',
                      background: '#E6F9ED',
                      color: '#1a7a3a',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Scheduled · {formatDateTime(nl.schedule.scheduledAt, timezone)}
                  </span>
                ) : (
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
                    Not scheduled
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
                  {nl.lastSentAt ? formatDateTime(nl.lastSentAt, timezone) : '—'}
                </span>
              </td>
              <td>
                <div
                  style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Test button — always available; carries the next regular send day's note */}
                  <button
                    onClick={() => handleSchedule(nl.number, undefined, { test: true })}
                    disabled={actionLoading}
                    title={(() => {
                      const note = noteForSendAt(nextRegularSendAt);
                      return note ? `Includes note for ${formatNoteDate(note.sendDate)}` : undefined;
                    })()}
                    style={{
                      fontFamily: 'var(--body)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '4px 12px',
                      background: 'none',
                      color: 'var(--grape)',
                      border: '1px solid var(--grape)',
                      borderRadius: '4px',
                      cursor: actionLoading ? 'wait' : 'pointer',
                      opacity: actionLoading ? 0.6 : 1,
                    }}
                  >
                    Test
                  </button>

                  {/* Schedule button — show if not currently scheduled; disabled when no subscribers ready */}
                  {!nl.schedule && (
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
                            {nl.dueCount} subscriber{nl.dueCount === 1 ? '' : 's'}
                            {nl.segments.length > 1 && ` \u2014 ${nl.segments.length} segments will be merged`}
                          </div>
                          {(() => {
                            const sendAt = scheduleMode === 'choose'
                              ? nextRegularSendAt
                              : customSendAt ? localToUtcIso(customSendAt, customTimezone) : null;
                            const note = noteForSendAt(sendAt);
                            return note && (
                              <div
                                style={{
                                  fontFamily: 'var(--body)',
                                  fontSize: '0.75rem',
                                  color: 'var(--grape)',
                                  fontWeight: 600,
                                }}
                                title={note.body}
                              >
                                Includes note for {formatNoteDate(note.sendDate)}
                              </div>
                            );
                          })()}

                          {scheduleMode === 'choose' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                              <div style={{ display: 'flex', gap: '0.375rem' }}>
                                <button
                                  onClick={() => handleSchedule(nl.number, nextRegularSendAt)}
                                  disabled={actionLoading || !nextRegularSendAt}
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
                                  title={nextRegularSendAt ? formatDateTime(nextRegularSendAt, timezone) : 'Set the weekly send day and time first'}
                                >
                                  {actionLoading ? 'Scheduling...' : `Regular time${nextRegularSendAt ? ` \u2014 ${formatDateTime(nextRegularSendAt, timezone)}` : ''}`}
                                </button>
                              </div>
                              <div style={{ display: 'flex', gap: '0.375rem' }}>
                                <button
                                  onClick={() => {
                                    setCustomTimezone(timezone);
                                    setCustomSendAt(nextRegularSendAt ? toDatetimeLocal(nextRegularSendAt, timezone) : '');
                                    setScheduleMode('custom');
                                  }}
                                  style={{
                                    fontFamily: 'var(--body)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    padding: '4px 10px',
                                    background: 'none',
                                    color: 'var(--grape)',
                                    border: '1px solid var(--grape)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Custom time
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                              <input
                                type="datetime-local"
                                value={customSendAt}
                                onChange={(e) => setCustomSendAt(e.target.value)}
                                style={{
                                  fontFamily: 'var(--body)',
                                  fontSize: '0.75rem',
                                  color: 'var(--ink)',
                                  padding: '3px 6px',
                                  border: '1px solid var(--line)',
                                  borderRadius: '4px',
                                  background: '#fff',
                                }}
                              />
                              <select
                                value={customTimezone}
                                onChange={(e) => setCustomTimezone(e.target.value)}
                                style={{
                                  fontFamily: 'var(--body)',
                                  fontSize: '0.75rem',
                                  color: 'var(--ink)',
                                  padding: '3px 6px',
                                  border: '1px solid var(--line)',
                                  borderRadius: '4px',
                                  background: '#fff',
                                }}
                              >
                                {TIMEZONE_OPTIONS.map(tz => (
                                  <option key={tz} value={tz}>{formatTimezone(tz)}</option>
                                ))}
                              </select>
                              <div style={{ display: 'flex', gap: '0.375rem' }}>
                                <button
                                  onClick={() => handleSchedule(nl.number, localToUtcIso(customSendAt, customTimezone))}
                                  disabled={actionLoading || !customSendAt}
                                  style={{
                                    fontFamily: 'var(--body)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    padding: '4px 10px',
                                    background: customSendAt ? 'var(--grape)' : 'var(--line)',
                                    color: customSendAt ? '#fff' : 'var(--muted)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: actionLoading || !customSendAt ? 'default' : 'pointer',
                                    opacity: actionLoading ? 0.6 : 1,
                                  }}
                                >
                                  {actionLoading ? 'Scheduling...' : 'Schedule'}
                                </button>
                                <button
                                  onClick={() => setScheduleMode('choose')}
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
                                  Back
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setConfirmSchedule(nl.number);
                            setScheduleMode('choose');
                            setActionMessage(null);
                          }}
                          disabled={nl.dueCount === 0}
                          title={nl.dueCount === 0 ? 'No subscribers ready for this issue' : undefined}
                          style={{
                            fontFamily: 'var(--body)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '4px 12px',
                            background: nl.dueCount === 0 ? 'var(--line)' : 'var(--grape)',
                            color: nl.dueCount === 0 ? 'var(--muted)' : '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: nl.dueCount === 0 ? 'default' : 'pointer',
                          }}
                        >
                          Schedule
                        </button>
                      )}
                    </>
                  )}

                  {/* Unschedule button — only when scheduled */}
                  {nl.schedule && (
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

                  {/* Delete — only for issues never sent or scheduled */}
                  {nl.receivedCount === 0 && !nl.schedule && (
                    confirmDelete === nl.number ? (
                      <>
                      <button
                        onClick={() => handleDeleteIssue(nl.number)}
                        title={`Delete #${nl.number}? Later drafts will be renumbered.`}
                        disabled={actionLoading}
                        style={{
                          fontFamily: 'var(--body)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '4px 12px',
                          background: 'var(--coral)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: actionLoading ? 'wait' : 'pointer',
                          opacity: actionLoading ? 0.6 : 1,
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        style={{
                          fontFamily: 'var(--body)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '4px 12px',
                          background: 'none',
                          color: 'var(--muted)',
                          border: '1px solid var(--line)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(nl.number)}
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
                        Delete
                      </button>
                    )
                  )}

                </div>
              </td>
            </tr>
            {expandedReady === nl.number && nl.segments.length > 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 0 }}>
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
                        Segment contacts
                        {segmentContacts[nl.segments[0].id] && (
                          <span style={{ textTransform: 'none', fontWeight: 400 }}>
                            {' '}({segmentContacts[nl.segments[0].id].length})
                          </span>
                        )}
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
                    {loadingSegmentContacts === nl.segments[0].id ? (
                      <div style={{ fontFamily: 'var(--body)', fontSize: '0.8125rem', color: 'var(--muted)', padding: '0.25rem 0' }}>
                        Loading contacts from Resend...
                      </div>
                    ) : segmentContacts[nl.segments[0].id]?.length === 0 ? (
                      <div style={{ fontFamily: 'var(--body)', fontSize: '0.8125rem', color: 'var(--muted)', padding: '0.25rem 0' }}>
                        No contacts in segment
                      </div>
                    ) : segmentContacts[nl.segments[0].id] ? (
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontFamily: 'var(--body)',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <tbody>
                          {segmentContacts[nl.segments[0].id].map((contact) => (
                            <tr key={contact.email}>
                              <td
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  color: 'var(--ink)',
                                  fontWeight: 500,
                                }}
                              >
                                {contact.firstName}
                                {contact.lastName ? ` ${contact.lastName}` : ''}
                              </td>
                              <td
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  color: 'var(--muted)',
                                }}
                              >
                                {contact.email}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}

                    {/* Existing segments for this issue */}
                    <div
                      style={{
                        marginTop: '0.5rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid var(--line)',
                      }}
                    >
                      {nl.segments.map(seg => (
                        <div
                          key={seg.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.25rem',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '3px',
                              background: '#EDE9FE',
                              color: 'var(--grape)',
                            }}
                          >
                            {seg.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSegment(seg.id);
                            }}
                            disabled={deletingSegment === seg.id}
                            style={{
                              fontFamily: 'var(--body)',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              background: 'none',
                              border: '1px solid var(--coral)',
                              borderRadius: '4px',
                              cursor: deletingSegment === seg.id ? 'wait' : 'pointer',
                              color: 'var(--coral)',
                              opacity: deletingSegment === seg.id ? 0.5 : 1,
                            }}
                          >
                            {deletingSegment === seg.id ? 'Deleting...' : 'Delete segment'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {expandedReady === nl.number && nl.segments.length === 0 && nl.dueSubscribers.length > 0 &&
              renderSubscriberList(
                'Next subscribers',
                nl.dueSubscribers,
                () => setExpandedReady(null),
                nl,
              )
            }
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {newsletters.length === 0 && (
        <div className={styles.empty}>No newsletters found</div>
      )}

      {/* Schedule progress modal */}
      {scheduleProgress && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34, 27, 61, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '480px',
              fontFamily: 'var(--body)',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--display)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--ink)',
                margin: '0 0 1.25rem 0',
              }}
            >
              {scheduleProgress.isTest ? 'Testing' : 'Scheduling'} Newsletter #{scheduleProgress.newsletterNumber}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {scheduleProgress.steps.map((step) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    opacity: step.status === 'pending' ? 0.4 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Status icon */}
                  <span
                    style={{
                      width: '1.25rem',
                      textAlign: 'center',
                      fontSize: step.status === 'in-progress' ? '0.875rem' : '1rem',
                      flexShrink: 0,
                    }}
                  >
                    {step.status === 'pending' && (
                      <span style={{ color: 'var(--muted)' }}>&#9675;</span>
                    )}
                    {step.status === 'in-progress' && (
                      <span className={styles.spinIcon} style={{ color: 'var(--grape)' }}>&#9697;</span>
                    )}
                    {step.status === 'done' && (
                      <span style={{ color: '#1a7a3a' }}>&#10003;</span>
                    )}
                    {step.status === 'error' && (
                      <span style={{ color: 'var(--coral)' }}>&#10007;</span>
                    )}
                  </span>

                  {/* Label + detail */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--ink)',
                        fontWeight: step.status === 'in-progress' ? 600 : 400,
                      }}
                    >
                      {step.label}
                    </span>
                    {step.status === 'in-progress' && step.current != null && step.total != null && (
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--muted)',
                        }}
                      >
                        {step.current}/{step.total}
                      </span>
                    )}
                    {step.status === 'done' && step.detail && (
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--muted)',
                        }}
                      >
                        {step.detail}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Success summary */}
            {scheduleProgress.result && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  background: '#F0FFF4',
                  color: '#1a7a3a',
                  fontSize: '0.875rem',
                }}
              >
                {scheduleProgress.isTest ? (
                  <>Test broadcast {scheduleProgress.result.broadcastId} sent to admin. Check your inbox.</>
                ) : (
                  <>
                    {scheduleProgress.result.kind === 'direct'
                      ? 'Individual emails'
                      : `Broadcast ${scheduleProgress.result.broadcastId}`} scheduled for{' '}
                    {formatDateTime(scheduleProgress.result.scheduledAt, timezone)} with{' '}
                    {scheduleProgress.result.contactCount} contact
                    {scheduleProgress.result.contactCount === 1 ? '' : 's'}.
                  </>
                )}
              </div>
            )}

            {/* Error summary */}
            {scheduleProgress.error && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  background: '#FFF5F5',
                  color: 'var(--coral)',
                  fontSize: '0.875rem',
                }}
              >
                {scheduleProgress.error}
              </div>
            )}

            {/* Close button — only when done or error */}
            {scheduleProgress.done && (
              <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                <button
                  onClick={() => setScheduleProgress(null)}
                  style={{
                    fontFamily: 'var(--body)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    padding: '6px 20px',
                    background: scheduleProgress.result ? 'var(--grape)' : 'none',
                    color: scheduleProgress.result ? '#fff' : 'var(--ink)',
                    border: scheduleProgress.result ? 'none' : '1px solid var(--line)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {scheduleProgress.result ? 'Done' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
