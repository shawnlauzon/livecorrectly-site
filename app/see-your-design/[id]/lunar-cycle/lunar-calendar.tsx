'use client';

import { useMemo, useState } from 'react';
import type { Chart } from '@/lib/types/chart';
import type { SerializedMoonTransit } from './lunar-timeline';
import { centerIndexToFunction } from '@/lib/hd-chart/constants';
import { Bodygraph } from '@/components/bodygraph/bodygraph';
import { computeTransitBodygraphState } from '@/components/bodygraph/bodygraph-state';
import { TYPE_COLORS } from '@/lib/lunar/type-colors';
import css from './lunar-calendar.module.css';

/** Priority ordering: higher = "stronger" type for day-cell coloring. */
const TYPE_PRIORITY: Record<string, number> = {
  'Express Builder': 4,
  'Classic Builder': 3,
  Initiator: 2,
  Advisor: 1,
  Evaluator: 0,
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface LunarCalendarProps {
  transits: SerializedMoonTransit[];
  timezone: string;
  chart: Chart;
  startMonth: string; // "YYYY-MM"
}

/** Format a time string in the user's timezone. */
function formatTime(isoString: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoString));
}

/** Get the YYYY-MM-DD key for a date in a given timezone. */
function dateKeyInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

const MS_PER_DAY = 86_400_000;

/**
 * Get epoch ms for midnight of a YYYY-MM-DD date in a given timezone.
 * Uses dateKeyInTimezone to calibrate: starts with a UTC estimate and
 * adjusts until the formatted date matches the target.
 */
function midnightInTimezone(dateKey: string, timezone: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  // Start with a UTC estimate of noon on that date (avoids DST edge at midnight)
  let guess = Date.UTC(y, m - 1, d, 12);
  // Find what date this guess maps to in the target timezone
  const guessKey = dateKeyInTimezone(new Date(guess), timezone);
  // Adjust by the difference in days
  const [gy, gm, gd] = guessKey.split('-').map(Number);
  const guessDays = Math.floor(Date.UTC(gy, gm - 1, gd) / MS_PER_DAY);
  const targetDays = Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
  guess += (targetDays - guessDays) * MS_PER_DAY;
  // Now guess is noon on the right day; walk back to midnight
  // by finding the hour offset
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  });
  const hourStr = formatter.format(new Date(guess));
  const hour = parseInt(hourStr, 10);
  return guess - hour * 3600_000;
}

/** A colored vertical segment within a day cell. */
interface DaySegment {
  startPct: number;
  endPct: number;
  type: string;
  color: string;
}

interface DayTransits {
  transits: SerializedMoonTransit[];
  strongestType: string;
  hasNonEvaluator: boolean;
  segments: DaySegment[];
}

/**
 * Group transits by calendar day in the user's timezone.
 * A transit that spans midnight appears on both days.
 */
function groupTransitsByDay(
  transits: SerializedMoonTransit[],
  timezone: string,
): Map<string, DayTransits> {
  const byDay = new Map<string, SerializedMoonTransit[]>();

  for (const t of transits) {
    const enterKey = dateKeyInTimezone(new Date(t.enterTime), timezone);
    const exitKey = dateKeyInTimezone(new Date(t.exitTime), timezone);

    if (!byDay.has(enterKey)) byDay.set(enterKey, []);
    byDay.get(enterKey)!.push(t);

    // If the transit spans into a different day, add it there too
    if (exitKey !== enterKey) {
      if (!byDay.has(exitKey)) byDay.set(exitKey, []);
      byDay.get(exitKey)!.push(t);
    }
  }

  const result = new Map<string, DayTransits>();
  for (const [key, dayTransits] of byDay) {
    let strongestType = 'Evaluator';
    let strongestPriority = -1;
    let hasNonEvaluator = false;

    for (const t of dayTransits) {
      const priority = TYPE_PRIORITY[t.resultingType] ?? 0;
      if (t.resultingType !== 'Evaluator') hasNonEvaluator = true;
      if (priority > strongestPriority) {
        strongestPriority = priority;
        strongestType = t.resultingType;
      }
    }

    // Compute hour-proportional segments for non-Evaluator transits
    const segments: DaySegment[] = [];
    if (hasNonEvaluator) {
      const dayStartMs = midnightInTimezone(key, timezone);
      const dayEndMs = dayStartMs + MS_PER_DAY;

      for (const t of dayTransits) {
        if (t.resultingType === 'Evaluator') continue;
        const enterMs = new Date(t.enterTime).getTime();
        const exitMs = new Date(t.exitTime).getTime();
        const clampedStart = Math.max(enterMs, dayStartMs);
        const clampedEnd = Math.min(exitMs, dayEndMs);
        if (clampedEnd <= clampedStart) continue;

        const startPct = ((clampedStart - dayStartMs) / MS_PER_DAY) * 100;
        const endPct = ((clampedEnd - dayStartMs) / MS_PER_DAY) * 100;
        const color = TYPE_COLORS[t.resultingType] ?? 'var(--muted)';
        segments.push({ startPct, endPct, type: t.resultingType, color });
      }
      // Sort segments by start position
      segments.sort((a, b) => a.startPct - b.startPct);
    }

    result.set(key, { transits: dayTransits, strongestType, hasNonEvaluator, segments });
  }

  return result;
}

/**
 * Get calendar grid info for a given year/month.
 * Returns { year, month, monthName, startDow (0=Sun), daysInMonth }.
 */
function getMonthInfo(year: number, month: number) {
  const monthName = new Date(year, month, 1).toLocaleString('en-US', { month: 'long' });
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { year, month, monthName, startDow, daysInMonth };
}

/** Build the YYYY-MM-DD key for a given year/month/day. */
function buildDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function LunarCalendar({
  transits,
  timezone,
  chart,
  startMonth,
}: LunarCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Parse startMonth into year/month
  const [startYear, startMo] = startMonth.split('-').map(Number);
  const month1 = { year: startYear, month: startMo - 1 }; // JS months are 0-indexed
  const month2Year = startMo === 12 ? startYear + 1 : startYear;
  const month2Mo = startMo === 12 ? 0 : startMo; // next month (0-indexed)

  const transitsByDay = useMemo(
    () => groupTransitsByDay(transits, timezone),
    [transits, timezone],
  );

  const todayKey = useMemo(
    () => dateKeyInTimezone(new Date(), timezone),
    [timezone],
  );

  const selectedDayTransits = useMemo(() => {
    if (!selectedDate) return null;
    return transitsByDay.get(selectedDate) ?? null;
  }, [selectedDate, transitsByDay]);

  function renderMonthGrid(year: number, month: number) {
    const info = getMonthInfo(year, month);
    const cells: React.ReactNode[] = [];

    // Empty cells before the first day
    for (let i = 0; i < info.startDow; i++) {
      cells.push(<div key={`empty-${i}`} />);
    }

    for (let day = 1; day <= info.daysInMonth; day++) {
      const dateKey = buildDateKey(year, month, day);
      const dayData = transitsByDay.get(dateKey);
      const isToday = dateKey === todayKey;
      const isPast = dateKey < todayKey;
      const isSelected = dateKey === selectedDate;
      const hasNonEvaluator = dayData?.hasNonEvaluator ?? false;
      const hasData = !!dayData;

      // Build background: gradient bands for non-Evaluator segments, solid for no data
      let background: string;
      if (hasNonEvaluator && dayData!.segments.length > 0) {
        const stops: string[] = [];
        const segs = dayData!.segments;
        // Add transparent gap before first segment if it doesn't start at 0
        if (segs[0].startPct > 0) {
          stops.push(`transparent 0%`);
          stops.push(`transparent ${segs[0].startPct}%`);
        }
        for (let s = 0; s < segs.length; s++) {
          const seg = segs[s];
          stops.push(`${seg.color} ${seg.startPct}%`);
          stops.push(`${seg.color} ${seg.endPct}%`);
          // Add transparent gap between this segment and next
          if (s < segs.length - 1) {
            const nextStart = segs[s + 1].startPct;
            if (seg.endPct < nextStart) {
              stops.push(`transparent ${seg.endPct}%`);
              stops.push(`transparent ${nextStart}%`);
            }
          }
        }
        // Add transparent gap after last segment if it doesn't end at 100
        const lastEnd = segs[segs.length - 1].endPct;
        if (lastEnd < 100) {
          stops.push(`transparent ${lastEnd}%`);
          stops.push(`transparent 100%`);
        }
        background = `linear-gradient(to bottom, ${stops.join(', ')})`;
      } else if (hasData) {
        background = 'var(--stone, #f0edf7)';
      } else {
        background = 'transparent';
      }

      cells.push(
        <button
          key={dateKey}
          className={`${css.dayCell}${hasNonEvaluator ? ` ${css.clickable}` : ''}`}
          onClick={() => {
            if (hasNonEvaluator) {
              setSelectedDate(isSelected ? null : dateKey);
            }
          }}
          style={{
            fontWeight: isToday || isSelected ? 700 : 400,
            background,
            filter: isSelected ? 'brightness(1.15)' : undefined,
            color: hasNonEvaluator
              ? '#fff'
              : isPast || !hasData
                ? 'var(--muted)'
                : 'var(--ink)',
            opacity: isPast && !hasData ? 0.35 : isPast ? 0.6 : 1,
            outline: isSelected
              ? '2.5px solid var(--ink)'
              : isToday
                ? '2px solid var(--grape)'
                : 'none',
            outlineOffset: isSelected ? -1 : isToday ? -2 : 0,
          }}
        >
          {day}
        </button>,
      );
    }

    return (
      <div>
        <h3
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 700,
            fontSize: '1.1rem',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          {info.monthName} {info.year}
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 6,
            textAlign: 'center',
          }}
        >
          {DAY_LABELS.map((label, i) => (
            <div
              key={`hdr-${i}`}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--muted)',
                paddingBottom: 4,
              }}
            >
              {label}
            </div>
          ))}
          {cells}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: 'flex',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* Left half — calendar grids + legend */}
        <div style={{ flex: '0 0 50%', minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 28,
            }}
          >
            {renderMonthGrid(month1.year, month1.month)}
            {renderMonthGrid(month2Year, month2Mo)}
          </div>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 16,
              fontSize: '0.78rem',
              color: 'var(--muted)',
              alignItems: 'center',
            }}
          >
            {(['Express Builder', 'Classic Builder', 'Initiator', 'Advisor'] as const).map(
              (type) => (
                <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: TYPE_COLORS[type],
                    }}
                  />
                  {type}
                </span>
              ),
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  border: '2px solid var(--grape)',
                  background: 'transparent',
                }}
              />
              Today
            </span>
          </div>
        </div>

        {/* Right half — detail pane */}
        <div style={{ flex: '0 0 50%', minWidth: 0 }}>
          {selectedDate && selectedDayTransits ? (
            <DayDetailPane
              dateKey={selectedDate}
              dayData={selectedDayTransits}
              timezone={timezone}
              chart={chart}
              onClose={() => setSelectedDate(null)}
            />
          ) : (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: '0.92rem',
                border: '1.5px dashed var(--line)',
                borderRadius: 12,
              }}
            >
              Click a highlighted day to see transit details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day detail pane
// ---------------------------------------------------------------------------

interface DayDetailPaneProps {
  dateKey: string;
  dayData: DayTransits;
  timezone: string;
  chart: Chart;
  onClose: () => void;
}

function DayDetailPane({ dateKey, dayData, timezone, chart, onClose }: DayDetailPaneProps) {
  // Format the date for the header
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dateLabel = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      style={{
        border: '1.5px solid var(--line)',
        borderRadius: 12,
        padding: 20,
        background: 'var(--card)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 700,
            fontSize: '1rem',
            margin: 0,
          }}
        >
          {dateLabel}
        </h3>
        <button
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontSize: '1.2rem',
            color: 'var(--muted)',
            lineHeight: 1,
            padding: '4px 8px',
          }}
          aria-label="Close detail pane"
        >
          &times;
        </button>
      </div>

      {/* Transits for the day */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {dayData.transits
          .filter((t) => t.completedChannels.length > 0)
          .map((transit, i) => (
            <TransitDetail key={`${transit.gate}-${i}`} transit={transit} timezone={timezone} chart={chart} />
          ))}
        {dayData.transits.filter((t) => t.completedChannels.length > 0).length === 0 && (
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
            No channel-completing transits on this day.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual transit detail within a day
// ---------------------------------------------------------------------------

interface TransitDetailProps {
  transit: SerializedMoonTransit;
  timezone: string;
  chart: Chart;
}

function TransitDetail({ transit, timezone, chart }: TransitDetailProps) {
  const typeColor = TYPE_COLORS[transit.resultingType] ?? 'var(--muted)';

  const transitState = useMemo(
    () => computeTransitBodygraphState(chart, transit.gate),
    [chart, transit.gate],
  );

  return (
    <div>
      {/* Time range + type badge */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
          {formatTime(transit.enterTime, timezone)}
          {' \u2192 '}
          {formatTime(transit.exitTime, timezone)}
        </p>
        <span
          style={{
            display: 'inline-block',
            marginTop: 4,
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: '0.78rem',
            fontWeight: 600,
            background: typeColor,
            color: '#fff',
          }}
        >
          Gate {transit.gate} &middot; {transit.resultingType}
        </span>
      </div>

      {/* Mini bodygraph */}
      <div style={{ width: 180, margin: '0 auto 12px' }}>
        <Bodygraph state={transitState} showGateNumbers={false} />
      </div>

      {/* Completed channels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {transit.completedChannels.map((ch) => (
          <div key={ch.name}>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>
              {ch.name}
              <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>
                ({ch.gates[0]}-{ch.gates[1]})
              </span>
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>
              {centerIndexToFunction[ch.centers[0]]} &harr; {centerIndexToFunction[ch.centers[1]]}
              <span style={{ marginLeft: 8 }}>&middot; {ch.thematic}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Defined centers */}
      {transit.definedCenters.length > 0 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 6 }}>
          Functions activated: {transit.definedCenters.map((c) => centerIndexToFunction[c]).join(', ')}
        </p>
      )}
    </div>
  );
}
