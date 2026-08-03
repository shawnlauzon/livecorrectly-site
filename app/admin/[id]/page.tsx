'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Subscriber } from '@/lib/types/subscriber';
import ChartDisplay from '@/components/admin/chart-display';
import ChartHero from '@/components/chart-hero';
import ChartImage from '@/components/admin/chart-image';
import hdChart from '@/lib/hd-chart';
import { shadowNames, shadowDescriptions, shadowThemes, shadowLessons, shadowPressures, channelStrengths } from '@/lib/hd-chart/constants';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
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
        <Link
          href={`/see-your-design/${subscriber.id}`}
          className={styles.publicLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          View public chart →
        </Link>
      </div>

      <div className={styles.card}>
        <ChartHero subscriber={subscriber} />
      </div>

      <StrengthsDisplay subscriber={subscriber} />

      <ShadowsDisplay subscriber={subscriber} />

      <WelcomeSeries subscriber={subscriber} onSubscriberUpdate={setSubscriber} />

      <EmailPreviews subscriber={subscriber} />

      <ChartJson chart={subscriber.chart} />
    </div>
  );
}

function StrengthsDisplay({ subscriber }: { subscriber: Subscriber }) {
  const hd = hdChart(subscriber.chart.chart);
  const strengths = hd.getStrengths();
  const channels = subscriber.chart.chart.channels ?? [];

  if (strengths.length === 0) {
    return null;
  }

  // Group by thematic, then sort by count descending
  const grouped: Record<string, { name: string; index: number; gates: readonly number[] }[]> = {};
  strengths.forEach((s, i) => {
    if (!grouped[s.thematic]) grouped[s.thematic] = [];
    const channelIndex = channels[i];
    grouped[s.thematic].push({
      name: s.name,
      index: channelIndex,
      gates: channelStrengths[channelIndex]?.gates ?? [],
    });
  });

  const sortedThematics = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className={styles.welcomeSection}>
      <div className={styles.welcomeCard}>
        <h2 className={styles.welcomeHeading}>Strengths ({strengths.length})</h2>
        <div className={styles.shadowsList}>
          {sortedThematics.map(([thematic, items]) => (
            <div key={thematic} className={styles.shadowItem}>
              <div className={styles.shadowHeader}>
                <span className={styles.shadowNumber}>{items.length}</span>
                <h3 className={styles.shadowName}>{thematic}</h3>
              </div>
              <div className={styles.shadowDetails}>
                {items.map((item) => (
                  <div key={item.index} className={styles.shadowDetail}>
                    <span className={styles.shadowDetailLabel}>{item.name}</span>
                    <span className={styles.shadowDetailText}>
                      Gates {item.gates.join('-')} (#{item.index})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShadowsDisplay({ subscriber }: { subscriber: Subscriber }) {
  const hd = hdChart(subscriber.chart.chart);
  const shadows = hd.getShadows();

  if (shadows.length === 0) {
    return null;
  }

  return (
    <div className={styles.welcomeSection}>
      <div className={styles.welcomeCard}>
        <h2 className={styles.welcomeHeading}>Shadows ({shadows.length})</h2>
        <div className={styles.shadowsList}>
          {shadows.map((functionName, index) => {
            // Determine the shadow name for display
            let displayShadowName = shadowNames[functionName] ?? '';
            if (functionName === 'Bringing Traits/Strengths') {
              displayShadowName = hd.hasFarBridges()
                ? 'Blaming others and becoming a victim'
                : 'Blaming yourself for something missing';
            }

            return (
            <div key={functionName} className={styles.shadowItem}>
              <div className={styles.shadowHeader}>
                <span className={styles.shadowNumber}>{index + 1}</span>
                <h3 className={styles.shadowName}>{displayShadowName || functionName}</h3>
              </div>
              {functionName === 'Bringing Traits/Strengths' ? (
                hd.hasNearBridges() ? (
                  <div className={styles.bridgeGates}>
                    {hd.getBridgeDescriptions().map((bridge) => (
                      <div key={bridge.gate} className={styles.bridgeGate}>
                        <span className={styles.bridgeGateNumber}>Gate {bridge.gate}</span>
                        <p className={styles.bridgeDescription}>{bridge.description}</p>
                        <div className={styles.bridgeDetails}>
                          <div className={styles.bridgeDetailRow}>
                            <span className={styles.bridgeDetailLabel}>Trait:</span>
                            <span className={styles.bridgeDetailText}>{bridge.trait}</span>
                          </div>
                          <div className={styles.bridgeDetailRow}>
                            <span className={styles.bridgeDetailLabel}>Harmonic Trait:</span>
                            <span className={styles.bridgeDetailText}>{bridge.harmonicTrait}</span>
                          </div>
                          <div className={styles.bridgeDetailRow}>
                            <span className={styles.bridgeDetailLabel}>Strength:</span>
                            <span className={styles.bridgeDetailText}>{bridge.strength}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hd.hasFarBridges() ? (
                  <div className={styles.shadowDetails}>
                    <p className={styles.shadowDescription}>
                      You may have a tendency to blame others and become a victim, believing that other people are the cause of the problem.
                    </p>
                    <div className={styles.shadowDetail}>
                      <span className={styles.shadowDetailLabel}>Wisdom:</span>
                      <span className={styles.shadowDetailText}>
                        You are designed to work with others and can help objectively work on problems that exist between others.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.shadowDetails}>
                    <p className={styles.shadowDescription}>
                      You may feel like something is missing and blame yourself or try to overcompensate in the area or areas you feel you are lacking.
                    </p>
                    <div className={styles.shadowDetail}>
                      <span className={styles.shadowDetailLabel}>Wisdom:</span>
                      <span className={styles.shadowDetailText}>
                        You are designed to work with others, and you will naturally attract others that have the skills and strengths you feel you lack, so don&#39;t try to do it on your own.
                      </span>
                    </div>
                  </div>
                )
              ) : (
                <>
                  <p className={styles.shadowDescription}>{shadowDescriptions[functionName]}</p>
                  <div className={styles.shadowDetails}>
                    <div className={styles.shadowDetail}>
                      <span className={styles.shadowDetailLabel}>Theme:</span>
                      <span className={styles.shadowDetailText}>{shadowThemes[functionName]}</span>
                    </div>
                    <div className={styles.shadowDetail}>
                      <span className={styles.shadowDetailLabel}>Lesson:</span>
                      <span className={styles.shadowDetailText}>{shadowLessons[functionName]}</span>
                    </div>
                    <div className={styles.shadowDetail}>
                      <span className={styles.shadowDetailLabel}>Pressure:</span>
                      <span className={styles.shadowDetailText}>{shadowPressures[functionName]}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            );
          })}
        </div>
      </div>
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

const EMAIL_LABELS = [
  'Welcome: Shadow hook',
  'Day 1: Career Type',
  'Day 2: Strategy',
  'Day 3: Authority',
  'Day 4: Indicators',
  'Day 5: Conclusion'
];

function EmailPreviewItem({ subscriber, step, label }: { subscriber: Subscriber; step: number; label: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const chart = parseChartForEmail(subscriber.chart.chart);
  const shadowTag = step === 0 ? chart.topShadow : null;

  const handleToggle = useCallback((e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const open = (e.target as HTMLDetailsElement).open;

    if (open && html === null && !loading) {
      const password = sessionStorage.getItem('adminPassword');
      if (!password) return;

      setLoading(true);
      setError(null);

      fetch(`/api/admin/subscribers/${subscriber.id}/preview-email?step=${step}`, {
        headers: { Authorization: `Bearer ${password}` }
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to load preview');
          }
          return res.json();
        })
        .then((data: { subject: string; html: string }) => {
          setSubject(data.subject);
          setHtml(data.html);
        })
        .catch((err: Error) => {
          setError(err.message);
          console.error(`[admin] Error loading email preview step ${step}:`, err);
        })
        .finally(() => setLoading(false));
    }
  }, [html, loading, subscriber.id, step]);

  // Resize iframe to match content height once HTML is loaded
  useEffect(() => {
    if (!html || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          iframe.style.height = doc.documentElement.scrollHeight + 'px';
        }
      } catch {
        // Cross-origin — shouldn't happen with srcdoc but just in case
      }
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [html]);

  return (
    <details className={styles.emailPreview} onToggle={handleToggle}>
      <summary className={styles.emailPreviewSummary}>
        {label}
        {shadowTag && (
          <span className={styles.emailPreviewTag}>{shadowTag}</span>
        )}
      </summary>
      <div className={styles.emailPreviewContent}>
        {loading && (
          <p className={styles.emailPreviewParagraph}>Loading preview...</p>
        )}
        {error && (
          <p className={styles.emailPreviewError}>{error}</p>
        )}
        {subject && (
          <div className={styles.emailPreviewSubject}>Subject: {subject}</div>
        )}
        {html && (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className={styles.emailPreviewIframe}
            sandbox="allow-same-origin"
            title={`${label} preview`}
          />
        )}
      </div>
    </details>
  );
}

function EmailPreviews({ subscriber }: { subscriber: Subscriber }) {
  return (
    <div className={styles.welcomeSection}>
      <div className={styles.welcomeCard}>
        <h2 className={styles.welcomeHeading}>Email Previews</h2>
        <div className={styles.emailPreviewList}>
          {EMAIL_LABELS.map((label, step) => (
            <EmailPreviewItem
              key={step}
              subscriber={subscriber}
              step={step}
              label={label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartJson({ chart }: { chart: import('@/lib/types/chart').ChartRecord }) {
  return (
    <div className={styles.welcomeSection}>
      <details className={styles.chartJsonDetails}>
        <summary className={styles.chartJsonButton}>
          Show Chart JSON
        </summary>
        <pre className={styles.chartJsonPre}>
          {JSON.stringify(chart, null, 2)}
        </pre>
      </details>
    </div>
  );
}
