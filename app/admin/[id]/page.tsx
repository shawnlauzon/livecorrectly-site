'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Subscriber } from '@/lib/types/subscriber';
import ChartDisplay from '@/components/admin/chart-display';
import ChartHero from '@/components/chart-hero';
import ChartImage from '@/components/admin/chart-image';
import styles from './detail.module.css';

const WELCOME_SERIES_LENGTH = 5;
const DAY_LABELS = ['Day 1: Career Type', 'Day 2: Strategy', 'Day 3: Authority', 'Day 4: Indicators', 'Day 5: Conclusion'];

export default function AdminDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscriberId, setSubscriberId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => setSubscriberId(id));
  }, [params]);

  useEffect(() => {
    if (!subscriberId) return;

    const password = sessionStorage.getItem('adminPassword');
    if (!password) {
      router.push('/admin');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/admin/subscribers/${subscriberId}`, {
          headers: {
            Authorization: `Bearer ${password}`
          }
        });

        if (cancelled) return;

        if (response.status === 401) {
          router.push('/admin');
          return;
        }

        if (!response.ok) {
          setError('Failed to load subscriber');
          return;
        }

        const data = await response.json();
        setSubscriber(data);
      } catch (err) {
        if (cancelled) return;
        setError('Failed to load subscriber');
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [subscriberId, router]);

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading subscriber...</p>
      </div>
    );
  }

  if (error || !subscriber) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>{error || 'Subscriber not found'}</p>
        <div style={{ textAlign: 'center' }}>
          <Link href="/admin" className={styles.backLink}>
            &larr; Back to list
          </Link>
        </div>
      </div>
    );
  }

  const birthTimeUtc = subscriber.chart?.meta?.birthData?.time?.utc;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/admin" className={styles.backLink}>
          &larr; Back to list
        </Link>
        <h1 className={styles.title}>
          {subscriber.first_name}{' '}
          {subscriber.last_name ? subscriber.last_name : ''}
        </h1>
        <p className={styles.subtitle}>{subscriber.email}</p>
      </div>

      <div className={styles.card}>
        <ChartHero subscriber={subscriber} />
      </div>

      <WelcomeSeries subscriber={subscriber} onSubscriberUpdate={setSubscriber} />
    </div>
  );
}

type NextEmailValue = 'not_started' | 'day1' | 'day2' | 'day3' | 'day4' | 'day5' | 'done' | 'paused';

function deriveNextEmailValue(sub: Subscriber): NextEmailValue {
  if (sub.seq_position >= WELCOME_SERIES_LENGTH) return 'done';
  if (sub.seq_position === 0 && !sub.next_send_at) return 'not_started';
  if (!sub.next_send_at && sub.seq_position > 0) return 'paused';
  const step = sub.seq_position + 1;
  if (step >= 1 && step <= 5) return `day${step}` as NextEmailValue;
  return 'not_started';
}

function getTomorrowISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(14, 0, 0, 0);
  return d.toISOString();
}

function WelcomeSeries({ subscriber, onSubscriberUpdate }: { subscriber: Subscriber; onSubscriberUpdate: (s: Subscriber) => void }) {
  const [sendingStep, setSendingStep] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const derivedValue = deriveNextEmailValue(subscriber);
  const [localOverride, setLocalOverride] = useState<NextEmailValue | null>(null);
  const nextEmailValue = localOverride ?? derivedValue;

  // Reset local override when subscriber data changes (e.g. after save)
  const subscriberKey = `${subscriber.seq_position}:${subscriber.next_send_at}`;
  const [lastSubscriberKey, setLastSubscriberKey] = useState(subscriberKey);
  if (subscriberKey !== lastSubscriberKey) {
    setLocalOverride(null);
    setLastSubscriberKey(subscriberKey);
  }

  const isActive = subscriber.email_status === 'active';
  const emailsSent = subscriber.seq_position;

  const handleSaveNextEmail = useCallback(async () => {
    const password = sessionStorage.getItem('adminPassword');
    if (!password) return;

    let seq_position: number;
    let next_send_at: string | null;

    switch (nextEmailValue) {
      case 'not_started':
        seq_position = 0;
        next_send_at = null;
        break;
      case 'day1':
        seq_position = 0;
        next_send_at = getTomorrowISO();
        break;
      case 'day2':
        seq_position = 1;
        next_send_at = getTomorrowISO();
        break;
      case 'day3':
        seq_position = 2;
        next_send_at = getTomorrowISO();
        break;
      case 'day4':
        seq_position = 3;
        next_send_at = getTomorrowISO();
        break;
      case 'day5':
        seq_position = 4;
        next_send_at = getTomorrowISO();
        break;
      case 'done':
        seq_position = 5;
        next_send_at = null;
        break;
      case 'paused':
        seq_position = subscriber.seq_position;
        next_send_at = null;
        break;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/subscribers/${subscriber.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`
        },
        body: JSON.stringify({ seq_position, next_send_at })
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to update' });
        return;
      }

      onSubscriberUpdate(data);
      setFeedback({ type: 'success', message: 'Email series updated' });
    } catch (err) {
      console.error('Error updating email series:', err);
      setFeedback({ type: 'error', message: 'Network error — could not save' });
    } finally {
      setSaving(false);
    }
  }, [nextEmailValue, subscriber.id, subscriber.seq_position, onSubscriberUpdate]);

  const handleSend = useCallback(async (step: number) => {
    const password = sessionStorage.getItem('adminPassword');
    if (!password) return;

    setSendingStep(step);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/subscribers/${subscriber.id}/send-welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`
        },
        body: JSON.stringify({ step })
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to send email' });
        return;
      }

      setFeedback({
        type: 'success',
        message: step === 0 ? 'Welcome email sent successfully' : `Day ${step} email sent successfully`
      });
    } catch (err) {
      console.error('Error sending welcome email:', err);
      setFeedback({ type: 'error', message: 'Network error — could not send email' });
    } finally {
      setSendingStep(null);
    }
  }, [subscriber.id]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.welcomeSection}>
      <div className={styles.welcomeCard}>
        <h2 className={styles.welcomeHeading}>Welcome Series</h2>

        <div className={styles.welcomeMeta}>
          <div className={styles.welcomeMetaItem}>
            <span className={styles.welcomeMetaLabel}>Emails sent</span>
            <span>{emailsSent} of {WELCOME_SERIES_LENGTH}</span>
          </div>
          <div className={styles.welcomeMetaItem}>
            <span className={styles.welcomeMetaLabel}>Email status</span>
            <span>{subscriber.email_status}</span>
          </div>
          {subscriber.next_send_at && (
            <div className={styles.welcomeMetaItem}>
              <span className={styles.welcomeMetaLabel}>Next scheduled</span>
              <span>{formatDate(subscriber.next_send_at)}</span>
            </div>
          )}
          <div className={styles.welcomeMetaItem}>
            <span className={styles.welcomeMetaLabel}>Next email</span>
            <div className={styles.nextEmailControl}>
              <select
                className={styles.nextEmailSelect}
                value={nextEmailValue}
                onChange={(e) => setLocalOverride(e.target.value as NextEmailValue)}
              >
                <option value="not_started">Not started</option>
                <option value="day1">Day 1</option>
                <option value="day2">Day 2</option>
                <option value="day3">Day 3</option>
                <option value="day4">Day 4</option>
                <option value="day5">Day 5</option>
                <option value="done">Done</option>
                <option value="paused">Paused</option>
              </select>
              <button
                className={styles.nextEmailSave}
                onClick={handleSaveNextEmail}
                disabled={saving || localOverride === null || localOverride === derivedValue}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {isActive ? (
          <div className={styles.welcomeButtons}>
            <button
              className={styles.dayButton}
              disabled={sendingStep !== null}
              onClick={() => handleSend(0)}
            >
              {sendingStep === 0 ? 'Sending...' : 'Welcome'}
            </button>
            {DAY_LABELS.map((label, i) => {
              const step = i + 1;
              const isSending = sendingStep === step;
              const alreadySent = step <= emailsSent;
              const buttonClass = [
                styles.dayButton,
                alreadySent ? styles.dayButtonSent : '',
                isSending ? styles.dayButtonSending : ''
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={step}
                  className={buttonClass}
                  disabled={sendingStep !== null}
                  onClick={() => handleSend(step)}
                >
                  {isSending ? 'Sending...' : label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className={styles.welcomeDisabled}>
            Cannot send emails — subscriber status is &ldquo;{subscriber.email_status}&rdquo;
          </p>
        )}

        {feedback && (
          <div className={`${styles.welcomeFeedback} ${feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}`}>
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
}
