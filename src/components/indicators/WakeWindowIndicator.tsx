'use client';

import { useI18n } from '@/lib/i18n';

export default function WakeWindowIndicator(props: {
  sinceWakeMs: number;
  lowMs: number;
  highMs: number;
  sampleSize: number;
  compact?: boolean;
}) {
  const { sinceWakeMs, lowMs, highMs, sampleSize, compact } = props;
  const { t, formatDurationValue } = useI18n();

  const min = Math.max(0, Math.min(lowMs, highMs));
  const max = Math.max(min + 1, Math.max(lowMs, highMs));

  // Progress is capped slightly beyond the corridor so the marker doesn't stick at 100%.
  const capMax = Math.max(max * 1.25, max + 20 * 60 * 1000);
  const p = Math.min(1, Math.max(0, sinceWakeMs / capMax));
  const left = `${Math.round(p * 100)}%`;

  const status =
    sinceWakeMs < min
      ? t('indicator.wake.tooEarly')
      : sinceWakeMs <= max
        ? t('indicator.wake.optimal')
        : t('indicator.wake.tooLate');
  const optimalLabel = t('indicator.wake.optimal');

  return (
    <div className="stack" style={{ gap: compact ? 8 : 10 }}>
      {!compact ? (
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontWeight: 900 }}>
            {t('indicator.wake.now', { duration: formatDurationValue(sinceWakeMs) })}
          </div>
          <span className={`pill ${status === optimalLabel ? 'pillActive' : ''}`}>{status}</span>
        </div>
      ) : (
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={`pill ${status === optimalLabel ? 'pillActive' : ''}`}>{status}</span>
          <span className="pill">
            {t('indicator.wake.windowCompact', {
              min: formatDurationValue(min),
              max: formatDurationValue(max),
            })}
          </span>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background:
              'linear-gradient(90deg, rgba(46,169,255,0.25), rgba(165,88,255,0.25), rgba(255,74,122,0.25))',
            border: '1px solid rgba(255,255,255,0.16)',
          }}
        />

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

        <div
          title={t('indicator.wake.markerTitle')}
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
            {t('indicator.wake.window', {
              min: formatDurationValue(min),
              max: formatDurationValue(max),
            })}
          </span>
          <span className="pill">{t('indicator.wake.basedOn', { samples: sampleSize })}</span>
        </div>
      ) : (
        <div className="small" style={{ opacity: 0.9 }}>
          {t('indicator.wake.basedOn', { samples: sampleSize })}
        </div>
      )}
    </div>
  );
}
