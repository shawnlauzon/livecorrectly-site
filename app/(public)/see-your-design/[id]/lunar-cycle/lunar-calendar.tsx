'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { Chart } from '@/lib/types/chart';
import type { SerializedMoonTransit } from './lunar-timeline';
import { centerIndexToFunction } from '@/lib/hd-chart/constants';
import { Bodygraph } from '@/components/bodygraph/bodygraph';
import { computeTransitBodygraphState } from '@/components/bodygraph/bodygraph-state';
import { TYPE_COLORS } from '@/lib/lunar/type-colors';
import css from './lunar-calendar.module.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface LunarCalendarProps {
  transits: SerializedMoonTransit[];
  timezone: string;
  chart: Chart;
  startMonth: string; // "YYYY-MM"
  subscriberId: string;
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
 */
function midnightInTimezone(dateKey: string, timezone: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  let guess = Date.UTC(y, m - 1, d, 12);
  const guessKey = dateKeyInTimezone(new Date(guess), timezone);
  const [gy, gm, gd] = guessKey.split('-').map(Number);
  const guessDays = Math.floor(Date.UTC(gy, gm - 1, gd) / MS_PER_DAY);
  const targetDays = Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
  guess += (targetDays - guessDays) * MS_PER_DAY;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  });
  const hourStr = formatter.format(new Date(guess));
  const hour = parseInt(hourStr, 10);
  return guess - hour * 3600_000;
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

/** Format a compact time like "2:45p" for timeline labels. */
function formatCompactTime(isoString: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date(isoString));
  const hour = parts.find((p) => p.type === 'hour')!.value;
  const min = parts.find((p) => p.type === 'minute')!.value;
  const dp = parts.find((p) => p.type === 'dayPeriod')!.value;
  const suffix = dp.toLowerCase().startsWith('a') ? 'a' : 'p';
  return min === '00' ? `${hour}${suffix}` : `${hour}:${min}${suffix}`;
}

/** A segment within a day — one transit's slice of a 24h period. */
interface DaySegment {
  startPct: number;
  endPct: number;
  type: string;
  color: string;
  gate: number;
}

/** Timeline segment — unmerged, with back-reference to transit index. */
interface TimelineSegment {
  startPct: number;
  endPct: number;
  type: string;
  color: string;
  gate: number;
  transitIndex: number;
  enterTime: string;
  exitTime: string;
}

interface DayTransits {
  transits: SerializedMoonTransit[];
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

    if (exitKey !== enterKey) {
      if (!byDay.has(exitKey)) byDay.set(exitKey, []);
      byDay.get(exitKey)!.push(t);
    }
  }

  const result = new Map<string, DayTransits>();
  for (const [key, dayTransits] of byDay) {
    let hasNonEvaluator = false;

    const segments: DaySegment[] = [];
    const dayStartMs = midnightInTimezone(key, timezone);
    const dayEndMs = dayStartMs + MS_PER_DAY;

    for (const t of dayTransits) {
      if (t.resultingType !== 'Evaluator') hasNonEvaluator = true;

      const enterMs = new Date(t.enterTime).getTime();
      const exitMs = new Date(t.exitTime).getTime();
      const clampedStart = Math.max(enterMs, dayStartMs);
      const clampedEnd = Math.min(exitMs, dayEndMs);
      if (clampedEnd <= clampedStart) continue;

      const startPct = ((clampedStart - dayStartMs) / MS_PER_DAY) * 100;
      const endPct = ((clampedEnd - dayStartMs) / MS_PER_DAY) * 100;
      const color = TYPE_COLORS[t.resultingType] ?? 'var(--muted)';
      segments.push({ startPct, endPct, type: t.resultingType, color, gate: t.gate });
    }
    segments.sort((a, b) => a.startPct - b.startPct);

    // Merge consecutive segments of the same type into one block
    const merged: DaySegment[] = [];
    for (const seg of segments) {
      const prev = merged[merged.length - 1];
      if (prev && prev.type === seg.type) {
        prev.endPct = seg.endPct;
      } else {
        merged.push({ ...seg });
      }
    }

    result.set(key, { transits: dayTransits, hasNonEvaluator, segments: merged });
  }

  return result;
}

/** Build the YYYY-MM-DD key for a given year/month/day. */
function buildDateKey(year: number, month: number, day: number): string {
  // Handle overflow/underflow — normalize with Date
  const d = new Date(year, month, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parse "YYYY-MM" into { year, month (0-indexed) }. */
function parseMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number);
  return { year: y, month: m - 1 };
}

/** Format { year, month (0-indexed) } into "YYYY-MM". */
function formatMonth(year: number, month: number): string {
  // Normalize overflow (month=12 → next year Jan, month=-1 → prev year Dec)
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Get month info for rendering. */
function getMonthInfo(year: number, month: number) {
  const d = new Date(year, month, 1);
  const monthName = d.toLocaleString('en-US', { month: 'long' });
  const startDow = d.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { year: d.getFullYear(), month: d.getMonth(), monthName, startDow, daysInMonth };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LunarCalendar({
  transits: initialTransits,
  timezone,
  chart,
  startMonth,
  subscriberId,
}: LunarCalendarProps) {
  const [displayMonth, setDisplayMonth] = useState(startMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    () => dateKeyInTimezone(new Date(), timezone),
  );
  const [loading, setLoading] = useState(false);

  // Cache of transit data by month key (state so reads during render are safe)
  const [transitCache, setTransitCache] = useState<Record<string, SerializedMoonTransit[]>>(
    () => ({ [startMonth]: initialTransits }),
  );
  // Guard ref — tracks which months have been fetched (only read in event handlers)
  const fetchedMonthsRef = useRef(new Set([startMonth]));

  const currentTransits = transitCache[displayMonth];

  const transitsByDay = useMemo(
    () => groupTransitsByDay(currentTransits ?? [], timezone),
    [currentTransits, timezone],
  );

  const todayKey = useMemo(
    () => dateKeyInTimezone(new Date(), timezone),
    [timezone],
  );

  const sortedDayKeys = useMemo(
    () => Array.from(transitsByDay.keys()).sort(),
    [transitsByDay],
  );

  const selectedDayTransits = useMemo(() => {
    if (!selectedDate) return null;
    return transitsByDay.get(selectedDate) ?? null;
  }, [selectedDate, transitsByDay]);

  const fetchMonth = useCallback(
    async (monthKey: string): Promise<SerializedMoonTransit[]> => {
      if (fetchedMonthsRef.current.has(monthKey)) {
        return transitCache[monthKey] ?? [];
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/lunar-transits?subscriberId=${subscriberId}&month=${monthKey}`,
        );
        if (res.ok) {
          const data = await res.json();
          const transits = data.transits as SerializedMoonTransit[];
          fetchedMonthsRef.current.add(monthKey);
          setTransitCache(prev => ({ ...prev, [monthKey]: transits }));
          return transits;
        }
      } finally {
        setLoading(false);
      }
      return [];
    },
    [subscriberId, transitCache],
  );

  const navigateMonth = useCallback(
    async (delta: number) => {
      const { year, month } = parseMonth(displayMonth);
      const nextKey = formatMonth(year, month + delta);
      setDisplayMonth(nextKey);
      setSelectedDate(null);
      await fetchMonth(nextKey);
    },
    [displayMonth, fetchMonth],
  );

  const goToToday = useCallback(async () => {
    // todayKey is "YYYY-MM-DD"; extract the month portion
    const todayMonth = todayKey.slice(0, 7); // "YYYY-MM"
    setDisplayMonth(todayMonth);
    setSelectedDate(todayKey);
    await fetchMonth(todayMonth);
  }, [todayKey, fetchMonth]);

  // Navigate month from day detail pane when prev/next day goes past boundary
  const handleDayBoundary = useCallback(
    async (direction: 1 | -1) => {
      const fromDate = selectedDate ?? '';
      const { year: y, month: m } = parseMonth(displayMonth);
      const nextKey = formatMonth(y, m + direction);
      setDisplayMonth(nextKey);
      setSelectedDate(null);
      const transits = await fetchMonth(nextKey);
      const dayKeys = Array.from(groupTransitsByDay(transits, timezone).keys()).sort();
      const target = direction === 1
        ? dayKeys.find(k => k > fromDate)
        : dayKeys.findLast(k => k < fromDate);
      if (target) setSelectedDate(target);
    },
    [displayMonth, fetchMonth, selectedDate, timezone],
  );

  const { year, month } = parseMonth(displayMonth);
  const info = getMonthInfo(year, month);

  // Build grid cells including trailing days
  const cells: React.ReactNode[] = [];

  // Leading days from previous month
  const prevMonthLastDay = new Date(info.year, info.month, 0).getDate();
  for (let i = info.startDow - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const dateKey = buildDateKey(info.year, info.month - 1, day);
    cells.push(
      <DayCell
        key={dateKey}
        dateKey={dateKey}
        day={day}
        dayData={transitsByDay.get(dateKey) ?? null}
        isToday={dateKey === todayKey}
        isSelected={dateKey === selectedDate}
        outsideMonth
        onSelect={setSelectedDate}
      />,
    );
  }

  // Current month days
  for (let day = 1; day <= info.daysInMonth; day++) {
    const dateKey = buildDateKey(info.year, info.month, day);
    cells.push(
      <DayCell
        key={dateKey}
        dateKey={dateKey}
        day={day}
        dayData={transitsByDay.get(dateKey) ?? null}
        isToday={dateKey === todayKey}
        isSelected={dateKey === selectedDate}
        outsideMonth={false}
        onSelect={setSelectedDate}
      />,
    );
  }

  // Trailing days from next month
  const totalCells = cells.length;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let day = 1; day <= remainingCells; day++) {
    const dateKey = buildDateKey(info.year, info.month + 1, day);
    cells.push(
      <DayCell
        key={dateKey}
        dateKey={dateKey}
        day={day}
        dayData={transitsByDay.get(dateKey) ?? null}
        isToday={dateKey === todayKey}
        isSelected={dateKey === selectedDate}
        outsideMonth
        onSelect={setSelectedDate}
      />,
    );
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div
        className={`${css.layoutContainer}${selectedDate ? ` ${css.hasSelection}` : ''}`}
      >
        {/* Left half — calendar grid + legend */}
        <div className={css.calendarColumn}>
          {/* Month header with navigation */}
          <div className={css.monthHeader}>
            <button
              className={css.navButton}
              onClick={() => navigateMonth(-1)}
              aria-label="Previous month"
            >
              &#8249;
            </button>
            <h3 className={css.monthTitle}>
              {info.monthName} {info.year}
            </h3>
            <button
              className={css.navButton}
              onClick={() => navigateMonth(1)}
              aria-label="Next month"
            >
              &#8250;
            </button>
            <button
              className={css.todayButton}
              onClick={goToToday}
            >
              Today
            </button>
          </div>

          {loading ? (
            <div className={css.loadingOverlay}>
              <span className={css.loadingDot} />
              Loading&hellip;
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 4,
              }}
            >
              {DAY_LABELS.map((label, i) => (
                <div
                  key={`hdr-${i}`}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--muted)',
                    paddingBottom: 4,
                    textAlign: 'center',
                  }}
                >
                  {label}
                </div>
              ))}
              {cells}
            </div>
          )}

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
            {(['Express Builder', 'Classic Builder', 'Initiator', 'Advisor', 'Evaluator'] as const).map(
              (type) => (
                <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: type === 'Evaluator' ? 'var(--stone, #f0edf7)' : TYPE_COLORS[type],
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
        <div className={css.detailColumn}>
          {selectedDate && selectedDayTransits ? (
            <DayDetailPane
              key={selectedDate}
              dateKey={selectedDate}
              dayData={selectedDayTransits}
              timezone={timezone}
              chart={chart}
              onSelectDate={setSelectedDate}
              onClose={() => setSelectedDate(null)}
              dayKeys={sortedDayKeys}
              onDayBoundary={handleDayBoundary}
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
              Click any day to see transit details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day cell component
// ---------------------------------------------------------------------------

interface DayCellProps {
  dateKey: string;
  day: number;
  dayData: DayTransits | null;
  isToday: boolean;
  isSelected: boolean;
  outsideMonth: boolean;
  onSelect: (dateKey: string | null) => void;
}

/** Total content area height in pixels (used for proportional sizing). */
const AGENDA_CONTENT_HEIGHT = 68;

function DayCell({ dateKey, day, dayData, isToday, isSelected, outsideMonth, onSelect }: DayCellProps) {
  const hasData = !!dayData;

  const classNames = [css.dayCell];
  if (outsideMonth) classNames.push(css.outsideMonth);
  if (isSelected) classNames.push(css.selected);
  if (isToday && !isSelected) classNames.push(css.today);

  const dayNumberClasses = [css.dayNumber];
  if (isToday) dayNumberClasses.push(css.todayNumber);
  if (isSelected) dayNumberClasses.push(css.selectedNumber);

  return (
    <button
      className={classNames.join(' ')}
      onClick={() => onSelect(isSelected ? null : dateKey)}
    >
      <span className={dayNumberClasses.join(' ')}>{day}</span>
      {hasData && (
        <div className={css.agendaArea}>
          {dayData.segments.map((seg, i) => {
            const heightPct = seg.endPct - seg.startPct;
            const heightPx = (heightPct / 100) * AGENDA_CONTENT_HEIGHT;
            const isEvaluator = seg.type === 'Evaluator';

            return (
              <div
                key={`${seg.type}-${i}`}
                className={`${css.agendaItem}${isEvaluator ? ` ${css.agendaItemEvaluator}` : ''}`}
                style={{
                  height: Math.max(heightPx, 4),
                  background: isEvaluator ? 'var(--stone, #f0edf7)' : seg.color,
                }}
                title={seg.type}
              />
            );
          })}
        </div>
      )}
    </button>
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
  onSelectDate: (dateKey: string) => void;
  onClose?: () => void;
  dayKeys: string[];
  onDayBoundary: (direction: 1 | -1) => void;
}

function DayDetailPane({ dateKey, dayData, timezone, chart, onSelectDate, onClose, dayKeys, onDayBoundary }: DayDetailPaneProps) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dateLabel = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const [selectedTransitIndex, setSelectedTransitIndex] = useState<number | null>(() => {
    const idx = dayData.transits.findIndex(t => t.resultingType !== 'Evaluator');
    return idx >= 0 ? idx : null;
  });

  // Prev/next day navigation
  const currentDayIdx = dayKeys.indexOf(dateKey);
  const prevDayKey = currentDayIdx > 0 ? dayKeys[currentDayIdx - 1] : null;
  const nextDayKey = currentDayIdx < dayKeys.length - 1 ? dayKeys[currentDayIdx + 1] : null;

  // Compute timeline segments, collapsing consecutive Evaluator transits
  const timelineSegments = useMemo(() => {
    const dayStartMs = midnightInTimezone(dateKey, timezone);
    const dayEndMs = dayStartMs + MS_PER_DAY;
    const raw: TimelineSegment[] = [];

    for (let i = 0; i < dayData.transits.length; i++) {
      const t = dayData.transits[i];
      const enterMs = new Date(t.enterTime).getTime();
      const exitMs = new Date(t.exitTime).getTime();
      const clampedStart = Math.max(enterMs, dayStartMs);
      const clampedEnd = Math.min(exitMs, dayEndMs);
      if (clampedEnd <= clampedStart) continue;

      const startPct = ((clampedStart - dayStartMs) / MS_PER_DAY) * 100;
      const endPct = ((clampedEnd - dayStartMs) / MS_PER_DAY) * 100;
      const color = TYPE_COLORS[t.resultingType] ?? 'var(--muted)';
      raw.push({
        startPct,
        endPct,
        type: t.resultingType,
        color,
        gate: t.gate,
        transitIndex: i,
        enterTime: t.enterTime,
        exitTime: t.exitTime,
      });
    }
    raw.sort((a, b) => a.startPct - b.startPct);

    // Merge consecutive Evaluator segments into one
    const merged: TimelineSegment[] = [];
    for (const seg of raw) {
      const prev = merged[merged.length - 1];
      if (seg.type === 'Evaluator' && prev?.type === 'Evaluator') {
        prev.endPct = seg.endPct;
        prev.exitTime = seg.exitTime;
        // transitIndex = -1 signals a collapsed group (not individually selectable)
        prev.transitIndex = -1;
      } else {
        merged.push({ ...seg });
      }
    }
    return merged;
  }, [dateKey, dayData.transits, timezone]);

  // Compute transition boundary times (where one segment ends and another begins)
  const transitionTimes = useMemo(() => {
    const times: { pct: number; label: string }[] = [];
    for (let i = 1; i < timelineSegments.length; i++) {
      const boundaryPct = timelineSegments[i].startPct;
      // Skip boundaries near midnight (< 1% or > 99%) — implicit from hour marks
      if (boundaryPct < 1 || boundaryPct > 99) continue;
      const label = formatCompactTime(timelineSegments[i].enterTime, timezone);
      times.push({ pct: boundaryPct, label });
    }
    return times;
  }, [timelineSegments, timezone]);

  const selectedTransit = selectedTransitIndex !== null ? dayData.transits[selectedTransitIndex] : null;

  // Hour mark positions: 12am=0%, 6am=25%, 12pm=50%, 6pm=75%
  const hourMarks = [
    { pct: 0, label: '12a' },
    { pct: 25, label: '6a' },
    { pct: 50, label: '12p' },
    { pct: 75, label: '6p' },
  ];

  return (
    <div
      className={css.detailPaneWrapper}
      style={{
        border: '1.5px solid var(--line)',
        borderRadius: 12,
        padding: 20,
        background: 'var(--card)',
      }}
    >
      {onClose && (
        <button className={css.closeButton} onClick={onClose} aria-label="Back to calendar">
          &#8249; Calendar
        </button>
      )}
      {/* Header */}
      <div className={css.dayDetailHeader}>
        <button
          className={css.dayNavButton}
          onClick={() => prevDayKey ? onSelectDate(prevDayKey) : onDayBoundary(-1)}
          aria-label="Previous day"
        >
          &#8249;
        </button>
        <h3 className={css.dayDetailTitle}>{dateLabel}</h3>
        <button
          className={css.dayNavButton}
          onClick={() => nextDayKey ? onSelectDate(nextDayKey) : onDayBoundary(1)}
          aria-label="Next day"
        >
          &#8250;
        </button>
      </div>

      {/* 24-hour timeline */}
      <div className={css.timeline}>
        {/* Row 1: Hour labels + tick marks */}
        <div className={css.timelineHours}>
          {Array.from({ length: 24 }, (_, h) => {
            const pct = (h / 24) * 100;
            const isMajor = h % 6 === 0;
            const mark = hourMarks.find((hm) => hm.pct === pct);
            return (
              <span key={h}>
                {mark && (
                  <span className={css.hourLabel} style={{ left: `${pct}%` }}>
                    {mark.label}
                  </span>
                )}
                <span
                  className={`${css.hourTick}${isMajor ? ` ${css.hourTickMajor}` : ''}`}
                  style={{ left: `${pct}%` }}
                />
              </span>
            );
          })}
        </div>

        {/* Row 2: Segment bar */}
        <div className={css.timelineBar}>
          {timelineSegments.map((seg, i) => {
            const isEvaluator = seg.type === 'Evaluator';
            const isSelected = !isEvaluator && selectedTransitIndex === seg.transitIndex;
            const classNames = [css.timelineSegment];
            if (isSelected) classNames.push(css.timelineSegmentSelected);
            if (isEvaluator) classNames.push(css.timelineSegmentEvaluator);

            return (
              <button
                key={`${seg.type}-${i}`}
                className={classNames.join(' ')}
                style={{
                  left: `${seg.startPct}%`,
                  width: `${seg.endPct - seg.startPct}%`,
                  background: isEvaluator ? 'var(--stone, #f0edf7)' : seg.color,
                  cursor: isEvaluator ? 'default' : 'pointer',
                }}
                onClick={isEvaluator ? undefined : () => setSelectedTransitIndex(
                  isSelected ? null : seg.transitIndex,
                )}
                title={isEvaluator ? 'Evaluator' : `${seg.type} — Gate ${seg.gate}`}
              >
                {!isEvaluator && seg.type}
              </button>
            );
          })}
        </div>

        {/* Row 3: Transition times */}
        {transitionTimes.length > 0 && (
          <div className={css.transitionTimes}>
            {transitionTimes.map((tt, i) => (
              <span
                key={i}
                className={css.transitionTime}
                style={{ left: `${tt.pct}%` }}
              >
                {tt.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Detail area */}
      {selectedTransit === null ? (
        <p className={css.detailPrompt}>
          {!dayData.hasNonEvaluator
            ? 'The Moon doesn\u2019t bring any energies to sample today.'
            : 'Tap a transit to see details'}
        </p>
      ) : (
        <TransitDetail transit={selectedTransit} timezone={timezone} chart={chart} />
      )}
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
