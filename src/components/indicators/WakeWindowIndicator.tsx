'use client';

import { formatDuration } from '@/lib/time';

export default function WakeWindowIndicator(props: {
  sinceWakeMs: number;
  lowMs: number;
  highMs: number;
  sampleSize: number;
  compact?: boolean;
}) {
  const { sinceWakeMs, lowMs, highMs, sampleSize, compact } = props;

  const min = Math.max(0, Math.min(lowMs, highMs));
  const max = Math.max(min + 1, Math.max(lowMs, highMs));

  // Progress is capped slightly beyond the corridor so the marker doesn't stick at 100%.
  const capMax = Math.max(max * 1.25, max + 20 * 60 * 1000);
  const p = Math.min(1, Math.max(0, sinceWakeMs / capMax));
  const left = `${Math.round(p * 100)}%`;

  const status = sinceWakeMs < min ? 'Рановато' : sinceWakeMs <= max ? 'Оптимально' : 'Поздновато';

  return (
    <div className="stack" style={{ gap: compact ? 8 : 10 }}>
      {!compact ? (
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontWeight: 900 }}>ВБ сейчас: {formatDuration(sinceWakeMs)}</div>
          <span className={`pill ${status === 'Оптимально' ? 'pillActive' : ''}`}>{status}</span>
        </div>
      ) : (
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={`pill ${status === 'Оптимально' ? 'pillActive' : ''}`}>{status}</span>
          <span className="pill">
            Окно: {formatDuration(min)}—{formatDuration(max)}
          </span>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        {/* Base bar */}
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background:
              'linear-gradient(90deg, rgba(46,169,255,0.25), rgba(165,88,255,0.25), rgba(255,74,122,0.25))',
            border: '1px solid rgba(255,255,255,0.16)',
          }}
        />

        {/* "Optimal" corridor */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${Math.round((min / capMax) * 100)}%`,
            width: `${Math.max(2, Math.round(((max - min) / capMax) * 100))}%`,
            height: 10,
            borderRadius: 999,
            background: 'linear-gradient(90deg, rgba(46,169,255,0.55), rgba(165,88,255,0.70))',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.10) inset',
          }}
        />

        {/* Marker */}
        <div
          title="Текущая длительность ВБ"
          style={{
            position: 'absolute',
            top: -4,
            left,
            width: 2,
            height: 18,
            borderRadius: 999,
            background: 'rgba(248,250,252,0.95)',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.20)',
          }}
        />
      </div>

      {!compact ? (
        <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span className="pill">
            Окно: {formatDuration(min)} — {formatDuration(max)}
          </span>
          <span className="pill">Основано на {sampleSize} ВБ (7 дней)</span>
        </div>
      ) : (
        <div className="small" style={{ opacity: 0.9 }}>
          Основано на {sampleSize} ВБ (7 дней)
        </div>
      )}
    </div>
  );
}
