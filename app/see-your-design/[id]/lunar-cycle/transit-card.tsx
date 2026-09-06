'use client';

import { useState } from 'react';
import type { SerializedMoonTransit } from './lunar-timeline';
import { centerNames } from '@/lib/hd-chart/constants';

/** Color mapping for BG5 career design types. */
const TYPE_COLORS: Record<string, string> = {
  'Classic Builder': 'var(--coral)',
  'Express Builder': 'var(--coral)',
  Initiator: 'var(--marigold)',
  Advisor: 'var(--grape)',
  Evaluator: 'var(--muted)',
};

interface TransitCardProps {
  transit: SerializedMoonTransit;
  isCurrent: boolean;
  timezone: string;
}

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

export default function TransitCard({ transit, isCurrent, timezone }: TransitCardProps) {
  const [expanded, setExpanded] = useState(isCurrent);
  const hasChannels = transit.completedChannels.length > 0;
  const typeColor = TYPE_COLORS[transit.resultingType] ?? 'var(--muted)';

  const row = (
    <>
      {/* Gate badge */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 38,
          height: 38,
          borderRadius: 8,
          background: hasChannels ? typeColor : 'var(--stone)',
          color: hasChannels ? '#fff' : 'var(--ink)',
          fontWeight: 700,
          fontSize: '0.95rem',
          flexShrink: 0,
        }}
      >
        {transit.gate}
      </span>

      {/* Time + type */}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
          {formatTime(transit.enterTime, timezone)}
        </span>
        {hasChannels ? (
          <span
            style={{
              display: 'inline-block',
              marginLeft: 8,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: '0.78rem',
              fontWeight: 600,
              background: typeColor,
              color: '#fff',
            }}
          >
            {transit.resultingType}
          </span>
        ) : (
          <span
            style={{
              display: 'inline-block',
              marginLeft: 8,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: '0.78rem',
              fontWeight: 500,
              background: 'var(--stone)',
              color: 'var(--muted)',
            }}
          >
            Evaluator
          </span>
        )}
      </span>

      {/* Current indicator */}
      {isCurrent && (
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: typeColor,
          }}
        >
          Now
        </span>
      )}
    </>
  );

  return (
    <div
      style={{
        border: `1.5px solid ${isCurrent ? typeColor : 'var(--line)'}`,
        borderRadius: 10,
        padding: '14px 18px',
        background: hasChannels ? 'var(--card)' : 'transparent',
        opacity: hasChannels ? 1 : 0.65,
        transition: 'opacity 0.15s',
      }}
    >
      {hasChannels ? (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
          }}
        >
          {row}
          <span
            style={{
              fontSize: '0.8rem',
              color: 'var(--muted)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}
          >
            &#9660;
          </span>
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {row}
        </div>
      )}

      {hasChannels && expanded && (
        <div style={{ marginTop: 12, paddingLeft: 50 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 4 }}>
            {formatTime(transit.enterTime, timezone)}
            {' \u2192 '}
            {formatTime(transit.exitTime, timezone)}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transit.completedChannels.map((ch) => (
              <div key={ch.name}>
                <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                  {ch.name}
                  <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>
                    ({ch.gates[0]}-{ch.gates[1]})
                  </span>
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                  {ch.centerNames[0]} &harr; {ch.centerNames[1]}
                  <span style={{ marginLeft: 8 }}>
                    &middot; {ch.thematic}
                  </span>
                </p>
              </div>
            ))}

            {transit.definedCenters.length > 0 && (
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 4 }}>
                Centers activated:{' '}
                {transit.definedCenters.map((c) => centerNames[c]).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
