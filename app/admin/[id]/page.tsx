'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Subscriber } from '@/lib/types/subscriber';
import ChartDisplay from '@/components/admin/chart-display';
import ChartHero from '@/components/chart-hero';
import ChartImage from '@/components/admin/chart-image';
import hdChart from '@/lib/hd-chart';
import { shadowNames, shadowDescriptions, shadowThemes, shadowLessons, shadowPressures, channelStrengths, gateTraits, functionToCenterIndex, centerNames, determinationNames, determinationConditions, environmentNames, environmentConditions, cognitionNames } from '@/lib/hd-chart/constants';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { hangingGateDescriptions } from '@/emails/content';
import styles from './detail.module.css';

const WELCOME_SERIES_LENGTH = 3;
const DAY_LABELS = ['Day 1: Career Type', 'Day 2: Signposts', 'Day 3: Invitation'];

export default function AdminDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const emailStep = searchParams.get('email');

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

      <EmailPreviewSelector subscriberId={subscriber.id} currentStep={emailStep} />

      <div className={styles.card}>
        <ChartHero subscriber={subscriber} />
      </div>

      <StrengthsDisplay subscriber={subscriber} />

      <ShadowsDisplay subscriber={subscriber} />

      <VariablesDisplay subscriber={subscriber} />

      <ReturnsDisplay subscriber={subscriber} />

      <WelcomeSeries subscriber={subscriber} onSubscriberUpdate={setSubscriber} />

      <EmailPreviews subscriber={subscriber} currentEmailStep={emailStep} />

      <BroadcastSection subscriber={subscriber} />

      <NewsletterSection subscriber={subscriber} />

      <ChartJson chart={subscriber.chart} />
    </div>
  );
}

function StrengthsDisplay({ subscriber }: { subscriber: Subscriber }) {
  const chart = subscriber.chart.chart;
  const hd = hdChart(chart);
  const strengths = hd.getStrengths();
  const channels = chart.channels ?? [];
  const planets = chart.planets ?? [];

  if (strengths.length === 0) {
    return null;
  }

  // Group strengths by thematic
  const grouped: Record<string, { name: string; gates: readonly number[] }[]> = {};
  strengths.forEach((s, i) => {
    if (!grouped[s.thematic]) grouped[s.thematic] = [];
    const channelIndex = channels[i];
    grouped[s.thematic].push({
      name: s.name,
      gates: channelStrengths[channelIndex]?.gates ?? [],
    });
  });

  // Count planetary activations per gate
  const gateActivationCount: Record<number, number> = {};
  for (const p of planets) {
    gateActivationCount[p.gate] = (gateActivationCount[p.gate] ?? 0) + 1;
  }

  // Count planetary activations per thematic:
  // sum gate activation counts for all gates in a thematic's defined channels
  const thematicActivations: Record<string, number> = {};
  for (const [thematic, items] of Object.entries(grouped)) {
    const thematicGates = new Set(items.flatMap(item => [...item.gates]));
    thematicActivations[thematic] = [...thematicGates].reduce(
      (sum, g) => sum + (gateActivationCount[g] ?? 0), 0
    );
  }

  const sortedThematics = Object.entries(grouped)
    .sort((a, b) => (thematicActivations[b[0]] ?? 0) - (thematicActivations[a[0]] ?? 0));

  const totalActivations = Object.values(thematicActivations).reduce((sum, n) => sum + n, 0);

  return (
    <div className={styles.welcomeSection}>
      <div className={styles.welcomeCard}>
        <h2 className={styles.welcomeHeading}>Strengths — {totalActivations} activations</h2>
        <div className={styles.shadowsList}>
          {sortedThematics.map(([thematic, items]) => (
            <div key={thematic} className={styles.shadowItem}>
              <div className={styles.shadowHeader}>
                <span className={styles.shadowNumber}>{thematicActivations[thematic]}</span>
                <h3 className={styles.shadowName}>{thematic}</h3>
              </div>
              <div className={styles.shadowDetails}>
                {items.map((item) => (
                  <div key={item.name} className={styles.shadowDetail}>
                    <span className={styles.shadowDetailLabel}>{item.name}</span>
                    <span className={styles.shadowDetailText}>
                      {item.gates.map(g => {
                        const count = gateActivationCount[g] ?? 0;
                        return (
                          <span key={g}>
                            {count > 0 && <span className={styles.traitActivationCount}>{count}</span>}
                            {gateTraits[g]?.trait ?? 'Unknown'} ({g})
                          </span>
                        );
                      }).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ' + ', el], [])}
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

function getWhyAnnotation(
  functionName: string,
  hd: ReturnType<typeof hdChart>
): string | null {
  if (functionName === 'Bringing Traits/Strengths') {
    const def = hd.definition() ?? 'unknown';
    const split = hd.splitType();
    const nearBridges = hd.getBridgeDescriptions();
    const farBridges = hd.getFarBridgeDescriptions();
    const channelBridges = hd.getChannelBridgeDescriptions();
    const totalBridges = nearBridges.length + farBridges.length + channelBridges.length;
    const parts: string[] = [];
    if (nearBridges.length > 0) parts.push(`${nearBridges.length} near`);
    if (farBridges.length > 0) parts.push(`${farBridges.length} wide`);
    if (channelBridges.length > 0) parts.push(`${channelBridges.length} channel`);
    const bridgeLabel = parts.length > 0 ? parts.join(' + ') + ' bridge(s)' : '0 bridges';
    const label = `${def.charAt(0).toUpperCase() + def.slice(1)} definition (${split}) — ${bridgeLabel}`;

    if (totalBridges <= 1) return label;

    // For 2W splits: channel bridge → 1 channel, far gates → pair of 2
    if (split === '2W') {
      const topBridge = hd.getTopBridge();
      if (topBridge?.bridge.isChannelBridge) {
        const b = topBridge.bridge;
        const bridgeLabel = `${b.strength} (${b.gate}/${b.harmonicGate})`;
        const ann = topBridge.annotation ? ` · ${topBridge.annotation}` : '';
        return `${label}, top: ${bridgeLabel}${ann}`;
      }
      const topPair = hd.getTopBridgePair();
      if (topPair) {
        const pairLabel = topPair.bridges
          .map(b => `${b.trait} (${b.gate})`)
          .join(' + ');
        const ann = topPair.annotation ? ` · ${topPair.annotation}` : '';
        return `${label}, top pair: ${pairLabel}${ann}`;
      }
    }

    const top = hd.getTopBridge();
    const priorityNote = top
      ? `top: ${top.bridge.trait} (${top.bridge.gate})${top.annotation ? ` · ${top.annotation}` : ''}`
      : 'no priority match';
    return `${label}, ${priorityNote}`;
  }

  const centerIndex = functionToCenterIndex[functionName];
  if (centerIndex === null || centerIndex === undefined) return null;

  const status = hd.getCenterStatus(centerIndex);
  const name = centerNames[centerIndex];
  if (status === 0) return `${name} center is open`;
  if (status === 1) return `${name} center is undefined`;
  return null;
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
        <h2 className={styles.welcomeHeading}>Shadows</h2>
        <div className={styles.shadowsList}>
          {shadows.map((functionName, index) => {
            // Determine the shadow name for display
            let displayShadowName = shadowNames[functionName] ?? '';
            if (functionName === 'Bringing Traits/Strengths') {
              const split = hd.splitType();
              if (split === '2VW') {
                displayShadowName = 'Blaming the world for something missing';
              } else if (split === '2W') {
                displayShadowName = 'Blaming others for something missing';
              } else if (hd.hasNearBridges() && hd.hasFarBridges()) {
                displayShadowName = 'Blaming yourself for something missing / Blaming others';
              } else if (hd.hasFarBridges()) {
                displayShadowName = 'Blaming others and becoming a victim';
              } else {
                displayShadowName = 'Blaming yourself for something missing';
              }
            }

            const whyAnnotation = index === 0 ? getWhyAnnotation(functionName, hd) : null;

            return (
            <div key={functionName} className={styles.shadowItem}>
              <div className={styles.shadowHeader}>
                <span className={styles.shadowOrdinal}>{index + 1}.</span>
                <h3 className={styles.shadowName}>{displayShadowName || functionName}</h3>
              </div>
              {whyAnnotation && (
                <p className={styles.shadowWhy}>{whyAnnotation}</p>
              )}
              {functionName === 'Bringing Traits/Strengths' ? (
                (() => {
                  const allBridges = hd.getAllBridgesSorted();
                  return allBridges.length > 0 ? (
                  <div className={styles.bridgeGates}>
                    {allBridges.map((bridge, i) => {
                      // Override with richer prose from hangingGateDescriptions
                      const hanging = hangingGateDescriptions[bridge.harmonicGate];
                      const description = hanging
                        ? (typeof hanging === 'string'
                            ? hanging
                            : hanging[bridge.gate] ?? bridge.description)
                        : bridge.description;
                      return (
                        <div key={i} className={styles.bridgeGate}>
                          <span className={styles.bridgeGateNumber}>
                            {bridge.isChannelBridge
                              ? `Channel ${bridge.gate}/${bridge.harmonicGate}`
                              : `Gate ${bridge.gate}`}
                          </span>
                          <p className={styles.bridgeDescription}>{description}</p>
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
                      );
                    })}
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
                );
                })()
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

function VariablesDisplay({ subscriber }: { subscriber: Subscriber }) {
  const planets = subscriber.chart.chart.planets ?? [];

  // Design Sun: id=0, activation=0 (design side)
  const designSun = planets.find(p => p.id === 0 && p.activation === 0);
  // Design South Node: id=3, activation=0 (design side)
  const designSouthNode = planets.find(p => p.id === 3 && p.activation === 0);

  if (!designSun && !designSouthNode) return null;

  const formatVariable = (
    color: number,
    tone: number,
    names: Record<number, string>,
    conditions: Record<number, [string, string]>,
  ): string | null => {
    const name = names[color];
    const conditionPair = conditions[color];
    const cognition = cognitionNames[tone];
    if (!name || !conditionPair || !cognition) return null;
    const condition = tone <= 3 ? conditionPair[0] : conditionPair[1];
    return `${condition} ${name} with ${cognition} Cognition`;
  };

  const phs = designSun
    ? formatVariable(designSun.color, designSun.tone, determinationNames, determinationConditions)
    : null;
  const env = designSouthNode
    ? formatVariable(designSouthNode.color, designSouthNode.tone, environmentNames, environmentConditions)
    : null;

  if (!phs && !env) return null;

  return (
    <div className={styles.welcomeSection}>
      <div className={styles.welcomeCard}>
        <h2 className={styles.welcomeHeading}>Variables</h2>
        <div className={styles.welcomeMeta}>
          {phs && (
            <div className={styles.welcomeMetaItem}>
              <span className={styles.welcomeMetaLabel}>PHS (Determination)</span>
              <span>{phs}</span>
            </div>
          )}
          {env && (
            <div className={styles.welcomeMetaItem}>
              <span className={styles.welcomeMetaLabel}>Environment</span>
              <span>{env}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatReturnDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const totalDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365.25);
  const remainingDays = totalDays - Math.floor(years * 365.25);
  const months = Math.floor(remainingDays / 30.44);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (parts.length === 0) {
    if (totalDays === 0) return isPast ? 'today' : 'today';
    parts.push(`${totalDays} ${totalDays === 1 ? 'day' : 'days'}`);
  }

  const label = parts.join(', ');
  return isPast ? `${label} ago` : `in ${label}`;
}

function getNextAnnualReturn(isoTimestamp: string): Date {
  const origin = new Date(isoTimestamp);
  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const candidate = new Date(Date.UTC(thisYear, origin.getUTCMonth(), origin.getUTCDate()));
  if (candidate <= now) {
    candidate.setUTCFullYear(thisYear + 1);
  }
  return candidate;
}

interface ReturnItem {
  name: string;
  date: Date;
  isPast: boolean;
  isAnnual: boolean;
}

function ReturnsDisplay({ subscriber }: { subscriber: Subscriber }) {
  const cycles = subscriber.chart?.chart?.cycles;
  const birthUtc = subscriber.chart?.meta?.birthData?.time?.utc;
  const designUtc = subscriber.chart?.meta?.birthData?.time?.design;

  if (!cycles && !birthUtc) return null;

  const cycleReturns: ReturnItem[] = [];
  const now = new Date();

  if (cycles) {
    const cycleEntries: { key: string; name: string }[] = [
      { key: 'saturn', name: 'Saturn Return' },
      { key: 'chiron', name: 'Chiron Return' },
      { key: 'uranus', name: 'Uranus Opposition' },
      { key: 'secondSaturn', name: 'Second Saturn Return' },
    ];

    for (const { key, name } of cycleEntries) {
      const value = cycles[key as keyof typeof cycles];
      if (value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          cycleReturns.push({
            name,
            date,
            isPast: date <= now,
            isAnnual: false,
          });
        }
      }
    }
  }

  // Sort: upcoming first (soonest), then past (most recent first)
  const upcoming = cycleReturns.filter(r => !r.isPast).sort((a, b) => a.date.getTime() - b.date.getTime());
  const past = cycleReturns.filter(r => r.isPast).sort((a, b) => b.date.getTime() - a.date.getTime());

  // Annual returns always at bottom
  const annualReturns: ReturnItem[] = [];
  if (birthUtc) {
    annualReturns.push({
      name: 'Solar Return',
      date: getNextAnnualReturn(birthUtc),
      isPast: false,
      isAnnual: true,
    });
  }
  if (designUtc) {
    annualReturns.push({
      name: 'Design Return',
      date: getNextAnnualReturn(designUtc),
      isPast: false,
      isAnnual: true,
    });
  }
  if (annualReturns.length > 1) {
    annualReturns.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  const allReturns = [...upcoming, ...past, ...annualReturns];

  if (allReturns.length === 0) return null;

  return (
    <div className={styles.welcomeSection}>
      <div className={styles.welcomeCard}>
        <h2 className={styles.welcomeHeading}>Returns</h2>
        <div className={styles.returnsList}>
          {allReturns.map((item) => (
            <div
              key={item.name}
              className={`${styles.returnItem} ${item.isPast ? styles.returnPast : ''}`}
            >
              <div className={styles.returnHeader}>
                <span className={styles.returnName}>
                  {item.name}
                  {item.isAnnual && (
                    <span className={styles.returnAnnualBadge}>annual</span>
                  )}
                </span>
                <div className={styles.returnDetails}>
                  <span className={styles.returnDate}>{formatReturnDate(item.date)}</span>
                  <span className={styles.returnRelative}>{formatRelativeDate(item.date)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatRelativeEngagement(dateString: string | null): string {
  if (!dateString) return '\u2014';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

type NextEmailValue = 'not_started' | 'day1' | 'day2' | 'day3' | 'done';

function deriveNextEmailValue(sub: Subscriber): NextEmailValue {
  if (sub.next_step > WELCOME_SERIES_LENGTH) return 'done';
  if (sub.next_step === 0) return 'not_started';
  if (sub.next_step >= 1 && sub.next_step <= 3) return `day${sub.next_step}` as NextEmailValue;
  return 'not_started';
}

function WelcomeSeries({ subscriber, onSubscriberUpdate }: { subscriber: Subscriber; onSubscriberUpdate: (s: Subscriber) => void }) {
  const [sendingStep, setSendingStep] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [touchingEngagement, setTouchingEngagement] = useState(false);

  const derivedValue = deriveNextEmailValue(subscriber);
  const [localOverride, setLocalOverride] = useState<NextEmailValue | null>(null);
  const nextEmailValue = localOverride ?? derivedValue;

  // Reset local override when subscriber data changes (e.g. after save)
  const subscriberKey = `${subscriber.next_step}`;
  const [lastSubscriberKey, setLastSubscriberKey] = useState(subscriberKey);
  if (subscriberKey !== lastSubscriberKey) {
    setLocalOverride(null);
    setLastSubscriberKey(subscriberKey);
  }

  const isActive = subscriber.email_status === 'active';
  const totalEmails = WELCOME_SERIES_LENGTH + 1; // welcome0 + days 1-N
  const emailsSent = Math.min(subscriber.next_step, totalEmails);

  const handleSaveNextEmail = useCallback(async () => {
    const password = sessionStorage.getItem('adminPassword');
    if (!password) return;

    let next_step: number;

    switch (nextEmailValue) {
      case 'not_started':
        next_step = 0;
        break;
      case 'day1':
        next_step = 1;
        break;
      case 'day2':
        next_step = 2;
        break;
      case 'day3':
        next_step = 3;
        break;
      case 'done':
        next_step = 4;
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
        body: JSON.stringify({ next_step })
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
  }, [nextEmailValue, subscriber.id, onSubscriberUpdate]);

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

  const handleRestart = useCallback(async () => {
    const password = sessionStorage.getItem('adminPassword');
    if (!password) return;

    setRestarting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/subscribers/${subscriber.id}/restart-series`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to restart series' });
        return;
      }

      // Refetch subscriber to get updated next_step
      const refetchResponse = await fetch(`/api/admin/subscribers/${subscriber.id}`, {
        headers: {
          Authorization: `Bearer ${password}`
        }
      });

      if (refetchResponse.ok) {
        const updatedSubscriber = await refetchResponse.json();
        onSubscriberUpdate(updatedSubscriber);
      }

      setFeedback({
        type: 'success',
        message: 'Series restarted — Welcome sent, Day 1 queued for next cron run'
      });
    } catch (err) {
      console.error('Error restarting series:', err);
      setFeedback({ type: 'error', message: 'Network error — could not restart series' });
    } finally {
      setRestarting(false);
    }
  }, [subscriber.id, onSubscriberUpdate]);

  const handleTouchEngagement = useCallback(async () => {
    const password = sessionStorage.getItem('adminPassword');
    if (!password) return;

    setTouchingEngagement(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/subscribers/${subscriber.id}/touch-engagement`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${password}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to record engagement' });
        return;
      }

      onSubscriberUpdate({ ...subscriber, last_engaged_at: data.last_engaged_at });
      setFeedback({ type: 'success', message: 'Engagement recorded' });
    } catch (err) {
      console.error('Error touching engagement:', err);
      setFeedback({ type: 'error', message: 'Network error — could not record engagement' });
    } finally {
      setTouchingEngagement(false);
    }
  }, [subscriber, onSubscriberUpdate]);

  return (
    <div className={styles.welcomeSection}>
      <div className={styles.welcomeCard}>
        <h2 className={styles.welcomeHeading}>Welcome Series</h2>

        <div className={styles.welcomeMeta}>
          <div className={styles.welcomeMetaItem}>
            <span className={styles.welcomeMetaLabel}>Emails sent</span>
            <span>{emailsSent} of {totalEmails}</span>
          </div>
          <div className={styles.welcomeMetaItem}>
            <span className={styles.welcomeMetaLabel}>Email status</span>
            <span>{subscriber.email_status}</span>
          </div>
          <div className={styles.welcomeMetaItem}>
            <span className={styles.welcomeMetaLabel}>Last active</span>
            <div className={styles.engagementRow}>
              <span>{formatRelativeEngagement(subscriber.last_engaged_at)}</span>
              <button
                className={styles.touchEngagementButton}
                onClick={handleTouchEngagement}
                disabled={touchingEngagement}
                title="Record manual engagement (e.g. they replied to an email)"
              >
                {touchingEngagement ? 'Saving...' : 'They replied'}
              </button>
            </div>
          </div>
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
                <option value="done">Done</option>
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
          <>
            <div className={styles.welcomeButtons}>
              <button
                className={styles.dayButton}
                disabled={sendingStep !== null || restarting}
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
                    disabled={sendingStep !== null || restarting}
                    onClick={() => handleSend(step)}
                  >
                    {isSending ? 'Sending...' : label}
                  </button>
                );
              })}
            </div>
            <div className={styles.restartButtonContainer}>
              <button
                className={styles.restartButton}
                disabled={sendingStep !== null || restarting}
                onClick={handleRestart}
              >
                {restarting ? 'Restarting...' : '↻ Restart Series'}
              </button>
            </div>
          </>
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
  'Day 2: Signposts',
  'Day 3: Invitation'
];

function EmailPreviewSelector({ subscriberId, currentStep }: { subscriberId: string; currentStep: string | null }) {
  const router = useRouter();

  const handleEmailSelect = (step: number) => {
    router.push(`/admin/${subscriberId}?email=${step}#email-previews`);
  };

  return (
    <div className={styles.emailPreviewSelector}>
      <label htmlFor="email-select" className={styles.emailPreviewSelectorLabel}>
        Jump to email preview:
      </label>
      <select
        id="email-select"
        className={styles.emailPreviewSelectorSelect}
        value={currentStep ?? ''}
        onChange={(e) => {
          const step = e.target.value;
          if (step) {
            handleEmailSelect(parseInt(step, 10));
          } else {
            router.push(`/admin/${subscriberId}`);
          }
        }}
      >
        <option value="">Select an email...</option>
        {EMAIL_LABELS.map((label, step) => (
          <option key={step} value={step}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmailPreviewItem({
  subscriber,
  step,
  label,
  autoOpen = false
}: {
  subscriber: Subscriber;
  step: number;
  label: string;
  autoOpen?: boolean;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(autoOpen);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const chart = parseChartForEmail(subscriber.chart.chart);
  const shadowTag = step === 0 ? chart.topShadow : null;

  // Auto-open and scroll into view if autoOpen is true
  useEffect(() => {
    if (autoOpen && detailsRef.current) {
      setIsOpen(true);
      // Small delay to ensure the DOM is updated before scrolling
      setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [autoOpen]);

  const loadPreview = useCallback((forceReload = false) => {
    if (!forceReload && (html !== null || loading)) return;

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
      .then((data: { subject: string; preview: string; html: string }) => {
        setSubject(data.subject);
        setPreview(data.preview);
        setHtml(data.html);
      })
      .catch((err: Error) => {
        setError(err.message);
        console.error(`[admin] Error loading email preview step ${step}:`, err);
      })
      .finally(() => setLoading(false));
  }, [html, loading, subscriber.id, step]);

  const handleRefresh = useCallback(() => {
    setHtml(null);
    setSubject(null);
    setPreview(null);
    loadPreview(true);
  }, [loadPreview]);

  // Load preview when opened (either manually or auto-opened)
  useEffect(() => {
    if (isOpen) {
      loadPreview();
    }
  }, [isOpen, loadPreview]);

  const handleToggle = useCallback((e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const open = (e.target as HTMLDetailsElement).open;
    setIsOpen(open);
  }, []);

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
    <details
      ref={detailsRef}
      className={styles.emailPreview}
      onToggle={handleToggle}
      open={isOpen}
    >
      <summary className={styles.emailPreviewSummary}>
        <span className={styles.emailPreviewLabel}>
          {label}
          {shadowTag && (
            <span className={styles.emailPreviewTag}>{shadowTag}</span>
          )}
        </span>
        {isOpen && (
          <button
            className={styles.emailPreviewRefresh}
            onClick={(e) => {
              e.preventDefault();
              handleRefresh();
            }}
            disabled={loading}
            title="Refresh preview"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
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
        {preview && (
          <div className={styles.emailPreviewPreview}>Preview: {preview}</div>
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

function EmailPreviews({ subscriber, currentEmailStep }: { subscriber: Subscriber; currentEmailStep: string | null }) {
  const targetStep = currentEmailStep ? parseInt(currentEmailStep, 10) : null;

  return (
    <div className={styles.welcomeSection} id="email-previews">
      <div className={styles.welcomeCard}>
        <h2 className={styles.welcomeHeading}>Email Previews</h2>
        <div className={styles.emailPreviewList}>
          {EMAIL_LABELS.map((label, step) => (
            <EmailPreviewItem
              key={step}
              subscriber={subscriber}
              step={step}
              label={label}
              autoOpen={targetStep === step}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const BROADCAST_OPTIONS = [
  { slug: 'reengagement-2026-08', label: 'Re-engagement (Aug 2026)' },
] as const;

function BroadcastSection({ subscriber }: { subscriber: Subscriber }) {
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [html, setHtml] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isActive = subscriber.email_status === 'active';

  const loadPreview = useCallback(async (slug: string) => {
    if (!slug) return;

    const password = sessionStorage.getItem('adminPassword');
    if (!password) return;

    setLoading(true);
    setError(null);
    setHtml(null);
    setSubject(null);
    setPreview(null);

    try {
      const response = await fetch(`/api/admin/subscribers/${subscriber.id}/preview-broadcast?slug=${slug}`, {
        headers: { Authorization: `Bearer ${password}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load preview');
      }

      const data: { subject: string; preview: string; html: string } = await response.json();
      setSubject(data.subject);
      setPreview(data.preview);
      setHtml(data.html);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load preview';
      setError(message);
      console.error('[admin] Error loading broadcast preview:', err);
    } finally {
      setLoading(false);
    }
  }, [subscriber.id]);

  const handleSend = useCallback(async () => {
    if (!selectedSlug) return;

    const password = sessionStorage.getItem('adminPassword');
    if (!password) return;

    setSending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/subscribers/${subscriber.id}/send-broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`
        },
        body: JSON.stringify({ slug: selectedSlug })
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to send broadcast' });
        return;
      }

      setFeedback({ type: 'success', message: 'Broadcast sent successfully' });
    } catch (err) {
      console.error('Error sending broadcast:', err);
      setFeedback({ type: 'error', message: 'Network error — could not send broadcast' });
    } finally {
      setSending(false);
    }
  }, [subscriber.id, selectedSlug]);

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const slug = e.target.value;
    setSelectedSlug(slug);
    setFeedback(null);
    if (slug) {
      loadPreview(slug);
    } else {
      setHtml(null);
      setSubject(null);
      setPreview(null);
      setError(null);
    }
  }, [loadPreview]);

  // Resize iframe to match content height
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
    <div className={styles.welcomeSection}>
      <div className={styles.welcomeCard}>
        <h2 className={styles.welcomeHeading}>Broadcasts</h2>

        <div className={styles.welcomeMeta}>
          <div className={styles.welcomeMetaItem}>
            <span className={styles.welcomeMetaLabel}>Select broadcast</span>
            <select
              className={styles.nextEmailSelect}
              value={selectedSlug}
              onChange={handleSlugChange}
            >
              <option value="">Choose a broadcast...</option>
              {BROADCAST_OPTIONS.map(({ slug, label }) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSlug && (
          <>
            <details className={styles.emailPreview} open>
              <summary className={styles.emailPreviewSummary}>
                <span className={styles.emailPreviewLabel}>Preview</span>
                <button
                  className={styles.emailPreviewRefresh}
                  onClick={(e) => {
                    e.preventDefault();
                    loadPreview(selectedSlug);
                  }}
                  disabled={loading}
                  title="Refresh preview"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
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
                {preview && (
                  <div className={styles.emailPreviewPreview}>Preview: {preview}</div>
                )}
                {html && (
                  <iframe
                    ref={iframeRef}
                    srcDoc={html}
                    className={styles.emailPreviewIframe}
                    sandbox="allow-same-origin"
                    title="Broadcast preview"
                  />
                )}
              </div>
            </details>

            {isActive ? (
              <div className={styles.welcomeButtons}>
                <button
                  className={styles.dayButton}
                  disabled={sending || loading}
                  onClick={handleSend}
                >
                  {sending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
            ) : (
              <p className={styles.welcomeDisabled}>
                Cannot send broadcast — subscriber status is &ldquo;{subscriber.email_status}&rdquo;
              </p>
            )}

            {feedback && (
              <div className={`${styles.welcomeFeedback} ${feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}`}>
                {feedback.message}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NewsletterSection({ subscriber }: { subscriber: Subscriber }) {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newsletterNumbers, setNewsletterNumbers] = useState<number[] | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isActive = subscriber.email_status === 'active';

  // Determine newsletter state
  let newsletterState: 'not_started' | 'in_progress' | 'complete';
  if (subscriber.next_step <= WELCOME_SERIES_LENGTH) {
    newsletterState = 'not_started';
  } else if (newsletterNumbers !== null && newsletterNumbers.includes(subscriber.next_step)) {
    newsletterState = 'in_progress';
  } else {
    newsletterState = newsletterNumbers === null ? 'in_progress' : 'complete';
  }

  const loadPreview = useCallback(async (step: number) => {
    const password = sessionStorage.getItem('adminPassword');
    if (!password) return;

    setLoading(true);
    setError(null);
    setHtml(null);
    setSubject(null);
    setPreview(null);

    try {
      const response = await fetch(`/api/admin/subscribers/${subscriber.id}/preview-newsletter?step=${step}`, {
        headers: { Authorization: `Bearer ${password}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load preview');
      }

      const data: { subject: string; preview: string; html: string; newsletterNumbers: number[] } = await response.json();
      setSubject(data.subject);
      setPreview(data.preview);
      setHtml(data.html);
      setNewsletterNumbers(data.newsletterNumbers);
      if (selectedStep === null) setSelectedStep(step);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load preview';
      setError(message);
      console.error('[admin] Error loading newsletter preview:', err);
    } finally {
      setLoading(false);
    }
  }, [subscriber.id, selectedStep]);

  // Load first newsletter on mount to populate the dropdown and discover available numbers
  useEffect(() => {
    const password = sessionStorage.getItem('adminPassword');
    if (!password) return;

    // Fetch preview for the first available newsletter to discover the full list
    fetch(`/api/admin/subscribers/${subscriber.id}/preview-newsletter?step=4`, {
      headers: { Authorization: `Bearer ${password}` }
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load preview');
        }
        return res.json();
      })
      .then((data: { subject: string; preview: string; html: string; newsletterNumbers: number[] }) => {
        setSubject(data.subject);
        setPreview(data.preview);
        setHtml(data.html);
        setNewsletterNumbers(data.newsletterNumbers);
        setSelectedStep(data.newsletterNumbers[0] ?? 4);
      })
      .catch((err: Error) => {
        setError(err.message);
        console.error('[admin] Error loading initial newsletter preview:', err);
      });
  }, [subscriber.id]);

  const handleSend = useCallback(async () => {
    if (selectedStep === null) return;
    const password = sessionStorage.getItem('adminPassword');
    if (!password) return;

    setSending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/subscribers/${subscriber.id}/send-newsletter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`
        },
        body: JSON.stringify({ step: selectedStep })
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to send newsletter' });
        return;
      }

      setFeedback({ type: 'success', message: `Newsletter #${selectedStep} sent successfully` });
    } catch (err) {
      console.error('Error sending newsletter:', err);
      setFeedback({ type: 'error', message: 'Network error — could not send newsletter' });
    } finally {
      setSending(false);
    }
  }, [subscriber.id, selectedStep]);

  const handleStepChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const step = parseInt(e.target.value, 10);
    setSelectedStep(step);
    setFeedback(null);
    loadPreview(step);
  }, [loadPreview]);

  // Resize iframe to match content height
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
        // Cross-origin — shouldn't happen with srcdoc
      }
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [html]);

  const stepOptions = newsletterNumbers ?? [];

  return (
    <div className={styles.welcomeSection}>
      <div className={styles.welcomeCard}>
        <h2 className={styles.welcomeHeading}>Newsletter Series</h2>

        <div className={styles.welcomeMeta}>
          <div className={styles.welcomeMetaItem}>
            <span className={styles.welcomeMetaLabel}>Status</span>
            <span>
              {newsletterState === 'not_started' && 'Not started (in welcome series)'}
              {newsletterState === 'in_progress' && `Next: #${subscriber.next_step} of ${newsletterNumbers ? newsletterNumbers.length : '...'}`}
              {newsletterState === 'complete' && `Complete (${newsletterNumbers ? newsletterNumbers.length : '...'} newsletters)`}
            </span>
          </div>
        </div>

        <div className={styles.welcomeMeta}>
          <div className={styles.welcomeMetaItem}>
            <span className={styles.welcomeMetaLabel}>Preview newsletter</span>
            <div className={styles.nextEmailControl}>
              <select
                className={styles.nextEmailSelect}
                value={selectedStep ?? ''}
                onChange={handleStepChange}
              >
                {stepOptions.map((n) => (
                  <option key={n} value={n}>
                    Newsletter #{n}
                  </option>
                ))}
              </select>
              <button
                className={styles.nextEmailSave}
                onClick={() => selectedStep !== null && loadPreview(selectedStep)}
                disabled={loading || selectedStep === null}
              >
                {loading ? 'Loading...' : 'Preview'}
              </button>
            </div>
          </div>
        </div>

        {(html || loading || error) && (
          <details className={styles.emailPreview}>
            <summary className={styles.emailPreviewSummary}>
              <span className={styles.emailPreviewLabel}>Newsletter #{selectedStep ?? ''}</span>
              <button
                className={styles.emailPreviewRefresh}
                onClick={(e) => {
                  e.preventDefault();
                  if (selectedStep !== null) loadPreview(selectedStep);
                }}
                disabled={loading || selectedStep === null}
                title="Refresh preview"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
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
              {preview && (
                <div className={styles.emailPreviewPreview}>Preview: {preview}</div>
              )}
              {html && (
                <iframe
                  ref={iframeRef}
                  srcDoc={html}
                  className={styles.emailPreviewIframe}
                  sandbox="allow-same-origin"
                  title={`Newsletter #${selectedStep ?? ''} preview`}
                />
              )}
            </div>
          </details>
        )}

        {isActive ? (
          <div className={styles.welcomeButtons}>
            <button
              className={styles.dayButton}
              disabled={sending || loading || selectedStep === null}
              onClick={handleSend}
            >
              {sending ? 'Sending...' : `Send Newsletter #${selectedStep ?? ''}`}
            </button>
          </div>
        ) : (
          <p className={styles.welcomeDisabled}>
            Cannot send newsletter — subscriber status is &ldquo;{subscriber.email_status}&rdquo;
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

function ChartJson({ chart }: { chart: import('@/lib/types/chart').ChartRecord }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(chart, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy chart JSON:', err);
    }
  };

  return (
    <div className={styles.welcomeSection}>
      <details className={styles.chartJsonDetails}>
        <summary className={styles.chartJsonButton}>
          Show Chart JSON
          <button
            className={styles.chartJsonCopy}
            onClick={(e) => {
              e.preventDefault();
              handleCopy();
            }}
            title={copied ? 'Copied!' : 'Copy JSON'}
          >
            {copied ? (
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
        </summary>
        <pre className={styles.chartJsonPre}>
          {JSON.stringify(chart, null, 2)}
        </pre>
      </details>
    </div>
  );
}
