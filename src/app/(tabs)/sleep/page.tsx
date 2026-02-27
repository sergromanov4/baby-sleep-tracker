'use client';

import { useEffect, useMemo, useState } from 'react';
import ActiveChildGate from '@/components/gates/ActiveChildGate';
import { SleepingBabyArt } from '@/components/illustrations/Illustrations';
import WakeWindowIndicator from '@/components/indicators/WakeWindowIndicator';
import SleepDurationIndicator from '@/components/indicators/SleepDurationIndicator';
import AppSelect from '@/components/forms/AppSelect';
import {
  computeWakeWindowModel,
  inferSleepKindByTime,
  getRunningSleepSession,
  startSleepSession,
  stopSleepSession,
} from '@/lib/repo';
import { getSleepErrorCode } from '@/lib/sleepRules';
import type { Child, SleepKind, SleepSession } from '@/lib/types';
import { useToast } from '@/components/feedback/useToast';
import { useI18n } from '@/lib/i18n';

export default function SleepPage() {
  return <ActiveChildGate>{(child) => <SleepScreen child={child} />}</ActiveChildGate>;
}

function SleepScreen({ child }: { child: Child }) {
  const minDaysForSmartScale = 3;
  const [kind, setKind] = useState<SleepKind>('nap');
  const [running, setRunning] = useState<SleepSession | null>(null);
  const [now, setNow] = useState(Date.now());
  const [wakeStart, setWakeStart] = useState<number | null>(null);
  const [wwLow, setWwLow] = useState<number>(90 * 60 * 1000);
  const [wwHigh, setWwHigh] = useState<number>(110 * 60 * 1000);
  const [wwSamples, setWwSamples] = useState<number>(0);
  const [wwDaysWithData, setWwDaysWithData] = useState<number>(0);
  const { show, Toast } = useToast();
  const { t, formatDurationValue } = useI18n();

  useEffect(() => {
    (async () => {
      const r = await getRunningSleepSession(child.id);
      setRunning(r ?? null);
      if (r) setKind(r.kind);
      else setKind(inferSleepKindByTime(Date.now()));

      const ww = await computeWakeWindowModel(child.id, 7);
      setWwLow(ww.low);
      setWwHigh(ww.high);
      setWwSamples(ww.sampleSize);
      setWwDaysWithData(ww.daysWithData);
      setWakeStart(ww.lastWakeMs !== null ? Date.now() - ww.lastWakeMs : null);
    })();
  }, [child.id]);

  const sinceWake = useMemo(
    () => (wakeStart ? Math.max(0, now - wakeStart) : null),
    [wakeStart, now],
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = useMemo(() => {
    if (!running) return 0;
    return Math.max(0, now - running.start);
  }, [running, now]);

  const hasSmartWakeScale = wwDaysWithData >= minDaysForSmartScale;

  const bedtimeHint = useMemo(() => {
    if (running) return null;
    if (!hasSmartWakeScale) return null;
    if (sinceWake === null) return null;

    const target = wwHigh;
    const remaining = target - sinceWake;
    const isNow = remaining <= 0;
    return { remaining: Math.max(0, remaining), isNow };
  }, [sinceWake, running, wwHigh, hasSmartWakeScale]);

  const activeKind = running?.kind ?? kind;

  const buttonVisual = useMemo(() => {
    if (running) {
      const max = activeKind === 'nap' ? 2 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
      return elapsed >= max ? 'wake' : 'sleeping';
    }
    return 'ready';
  }, [running, elapsed, activeKind]);

  const isBedtimeNow = useMemo(() => {
    if (running) return false;
    if (!hasSmartWakeScale) return false;
    if (sinceWake === null) return false;
    return sinceWake >= wwHigh;
  }, [running, sinceWake, wwHigh, hasSmartWakeScale]);

  return (
    <>
      <div className="stack">
        <div className="card stack" style={{ textAlign: 'center' }}>
          <div className="heroRow" style={{ justifyContent: 'center' }}>
            <div className="heroArt" aria-hidden>
              <SleepingBabyArt />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {running ? t('sleep.heroRunning') : t('sleep.heroStart')}
              </div>
              <div className="small">{t('sleep.heroSub')}</div>
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'center' }}>
            <span className="pill">{t('sleep.type')}</span>
            <AppSelect
              value={kind}
              onChange={(nextKind) => setKind(nextKind)}
              options={[
                { value: 'nap', label: t('sleep.kindNap') },
                { value: 'night', label: t('sleep.kindNight') },
              ]}
              disabled={!!running}
              style={{ maxWidth: 180 }}
            />
          </div>

          <button
            className={`sleepMainBtn ${
              buttonVisual === 'ready'
                ? 'sleepMainBtnReady'
                : buttonVisual === 'wake'
                  ? 'sleepMainBtnWake'
                  : 'sleepMainBtnSleeping'
            } ${buttonVisual !== 'ready' ? 'sleepMainBtnPulse' : ''}`}
            onClick={async () => {
              try {
                if (!running) {
                  const session = await startSleepSession({ childId: child.id, kind: activeKind });
                  setRunning(session);
                  show(t('sleep.toastStarted'));
                } else {
                  await stopSleepSession({ sessionId: running.id });
                  setRunning(null);
                  const ww = await computeWakeWindowModel(child.id, 7);
                  setWwLow(ww.low);
                  setWwHigh(ww.high);
                  setWwSamples(ww.sampleSize);
                  setWwDaysWithData(ww.daysWithData);
                  setWakeStart(ww.lastWakeMs !== null ? Date.now() - ww.lastWakeMs : null);
                  show(t('sleep.toastStopped'));
                }
              } catch (error: unknown) {
                const code = getSleepErrorCode(error);
                if (code === 'SLEEP_ACTIVE_EXISTS') show(t('sleep.errorActiveExists'));
                else if (code === 'SLEEP_OVERLAP') show(t('sleep.errorOverlap'));
                else show(t('sleep.errorSave'));
              }
            }}
            aria-label={running ? t('sleep.ariaStop') : t('sleep.ariaStart')}
          >
            <div className="sleepMainBtnIcon">
              {buttonVisual === 'ready' ? '🌙' : buttonVisual === 'wake' ? '⏰' : '💤'}
            </div>
            <div className="sleepMainBtnTitle">
              {buttonVisual === 'ready'
                ? t('sleep.btnPutToSleep')
                : buttonVisual === 'wake'
                  ? t('sleep.btnWakeUp')
                  : t('sleep.btnRunning')}
            </div>
            <div className="small" style={{ opacity: 0.92 }}>
              {running
                ? t('sleep.btnSubWake')
                : isBedtimeNow
                  ? t('sleep.btnSubNow')
                  : t('sleep.btnSubFellAsleep')}
            </div>
          </button>

          <div style={{ fontSize: 44, fontWeight: 800, marginTop: 6 }}>
            {running
              ? formatDurationValue(elapsed)
              : sinceWake !== null
                ? formatDurationValue(sinceWake)
                : '—'}
          </div>

          {!running && sinceWake !== null ? (
            <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="pill">
                {t('sleep.wakeNow')}: {formatDurationValue(sinceWake)}
              </span>
              {bedtimeHint ? (
                bedtimeHint.isNow ? (
                  <span className="pill pillActive">{t('sleep.bedtimeNow')}</span>
                ) : (
                  <span className="pill">
                    {t('sleep.untilSleep', {
                      duration: formatDurationValue(bedtimeHint.remaining),
                    })}
                  </span>
                )
              ) : null}
            </div>
          ) : null}

          <div style={{ marginTop: 12, textAlign: 'left' }}>
            {running && hasSmartWakeScale ? (
              <SleepDurationIndicator elapsedMs={elapsed} kind={activeKind} />
            ) : running ? (
              <div className="stack" style={{ gap: 10 }}>
                <div
                  className="row"
                  style={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                >
                  <div style={{ fontWeight: 900 }}>{t('sleep.scaleSleepNow')}</div>
                  <span className="pill">{t('sleep.badgeNotEnoughData')}</span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background:
                      'linear-gradient(90deg, rgba(46,169,255,0.22), rgba(165,88,255,0.22), rgba(255,74,122,0.18))',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                />
                <div className="small" style={{ opacity: 0.9 }}>
                  {t('sleep.scaleAfter3Days')}
                </div>
                <div className="small" style={{ opacity: 0.9 }}>
                  {t('sleep.scaleFilled', { filled: wwDaysWithData, total: minDaysForSmartScale })}
                </div>
              </div>
            ) : sinceWake !== null && hasSmartWakeScale ? (
              <WakeWindowIndicator
                sinceWakeMs={sinceWake}
                lowMs={wwLow}
                highMs={wwHigh}
                sampleSize={wwSamples}
              />
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                <div
                  className="row"
                  style={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                >
                  <div style={{ fontWeight: 900 }}>{t('sleep.scaleWakeNow')}</div>
                  <span className="pill">
                    {hasSmartWakeScale ? t('sleep.badgeNoDataNow') : t('sleep.badgeNotEnoughData')}
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background:
                      'linear-gradient(90deg, rgba(46,169,255,0.22), rgba(165,88,255,0.22), rgba(255,74,122,0.18))',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                />
                <div className="small" style={{ opacity: 0.9 }}>
                  {hasSmartWakeScale ? t('sleep.scaleNeedDataNow') : t('sleep.scaleAfter3Days')}
                </div>
                {!hasSmartWakeScale ? (
                  <div className="small" style={{ opacity: 0.9 }}>
                    {t('sleep.scaleFilled', {
                      filled: wwDaysWithData,
                      total: minDaysForSmartScale,
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="small">{t('sleep.profile', { name: child.name })}</div>
        </div>
      </div>

      {Toast}
    </>
  );
}
