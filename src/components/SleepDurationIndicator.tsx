'use client';

import { formatDuration } from '@/lib/time';
import type { SleepKind } from '@/lib/types';

export default function SleepDurationIndicator(props: { elapsedMs: number; kind: SleepKind }) {
  const { elapsedMs, kind } = props;

  // Soft "typical" corridor (not a recommendation, just for UI).
  const corridor = kind === 'nap'
    ? { low: 45 * 60 * 1000, high: 120 * 60 * 1000, cap: 3 * 60 * 60 * 1000 }
    : { low: 8 * 60 * 60 * 1000, high: 12 * 60 * 60 * 1000, cap: 14 * 60 * 60 * 1000 };

  const p = Math.min(1, Math.max(0, elapsedMs / corridor.cap));
  const left = `${Math.round(p * 100)}%`;

  const status = elapsedMs < corridor.low ? 'Только начался' : elapsedMs <= corridor.high ? 'Нормально' : 'Долго';

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontWeight: 900 }}>Сон: {formatDuration(elapsedMs)}</div>
        <span className={`pill ${status === 'Нормально' ? 'pillActive' : ''}`}>{status}</span>
      </div>

      <div style={{ position: 'relative' }}>
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background:
              'linear-gradient(90deg, rgba(46,169,255,0.25), rgba(165,88,255,0.25), rgba(255,74,122,0.20))',
            border: '1px solid rgba(255,255,255,0.16)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${Math.round((corridor.low / corridor.cap) * 100)}%`,
            width: `${Math.max(2, Math.round(((corridor.high - corridor.low) / corridor.cap) * 100))}%`,
            height: 10,
            borderRadius: 999,
            background: 'linear-gradient(90deg, rgba(46,169,255,0.55), rgba(165,88,255,0.70))',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.10) inset',
          }}
        />

        <div
          title="Текущая длительность сна"
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

      <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span className="pill">
          Тип: {kind === 'nap' ? 'Дневной' : 'Ночной'}
        </span>
        <span className="pill">
          Окно: {formatDuration(corridor.low)} — {formatDuration(corridor.high)}
        </span>
      </div>
    </div>
  );
}
