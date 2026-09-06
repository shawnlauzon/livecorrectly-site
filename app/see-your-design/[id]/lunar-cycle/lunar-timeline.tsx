'use client';

import { useMemo, useState } from 'react';
import type { Chart } from '@/lib/types/chart';
import type { CompletedChannel } from '@/lib/lunar';
import LunarCalendar from './lunar-calendar';

/** Wire format — dates are ISO strings after server->client serialization. */
export interface SerializedMoonTransit {
  gate: number;
  enterTime: string;
  exitTime: string;
  completedChannels: CompletedChannel[];
  definedCenters: number[];
  resultingType: string;
}

interface LunarTimelineProps {
  transits: SerializedMoonTransit[];
  firstName: string;
  chart: Chart;
  startMonth: string; // "YYYY-MM"
  subscriberId: string;
}

/**
 * Group timezones by region for the selector dropdown.
 * Uses Intl.supportedValuesOf which is available in all modern browsers.
 */
function getGroupedTimezones(): Map<string, string[]> {
  let allZones: string[];
  try {
    allZones = Intl.supportedValuesOf('timeZone');
  } catch {
    // Fallback for older environments
    allZones = [Intl.DateTimeFormat().resolvedOptions().timeZone];
  }

  const grouped = new Map<string, string[]>();
  for (const tz of allZones) {
    const slash = tz.indexOf('/');
    const region = slash > 0 ? tz.slice(0, slash) : 'Other';
    if (!grouped.has(region)) grouped.set(region, []);
    grouped.get(region)!.push(tz);
  }
  return grouped;
}

export default function LunarTimeline({ transits, firstName, chart, startMonth, subscriberId }: LunarTimelineProps) {
  const browserTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const [timezone, setTimezone] = useState(browserTimezone);
  const groupedZones = useMemo(getGroupedTimezones, []);

  const now = Date.now();

  // Find the current transit (the one whose window contains "now")
  const currentIndex = transits.findIndex((t) => {
    const enter = new Date(t.enterTime).getTime();
    const exit = new Date(t.exitTime).getTime();
    return now >= enter && now < exit;
  });

  // Count how many transits activate channels
  const activeCount = transits.filter((t) => t.completedChannels.length > 0).length;

  return (
    <div>
      {/* Summary */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.5 }}>
          {firstName}, <strong>{activeCount}</strong> of the{' '}
          <strong>{transits.length}</strong> Moon gate transits this cycle activate
          channels for you.
        </p>
        {currentIndex >= 0 && (
          <p
            style={{
              marginTop: 8,
              fontSize: '0.95rem',
              color: transits[currentIndex].completedChannels.length > 0
                ? 'var(--ink)'
                : 'var(--muted)',
            }}
          >
            Right now the Moon is in gate{' '}
            <strong>{transits[currentIndex].gate}</strong>
            {transits[currentIndex].completedChannels.length > 0
              ? ` \u2014 you\u2019re experiencing ${transits[currentIndex].resultingType} energy.`
              : ' \u2014 Evaluator mode, no channels completing.'}
          </p>
        )}
      </div>

      {/* Timezone selector */}
      <div style={{ marginBottom: 20 }}>
        <label
          htmlFor="tz-select"
          style={{ fontSize: '0.82rem', color: 'var(--muted)', marginRight: 8 }}
        >
          Timezone:
        </label>
        <select
          id="tz-select"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          style={{
            fontSize: '0.85rem',
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid var(--line)',
            background: 'var(--card)',
            color: 'var(--ink)',
          }}
        >
          {Array.from(groupedZones.entries()).map(([region, zones]) => (
            <optgroup key={region} label={region}>
              {zones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Calendar view */}
      <LunarCalendar
        transits={transits}
        timezone={timezone}
        chart={chart}
        startMonth={startMonth}
        subscriberId={subscriberId}
      />
    </div>
  );
}
