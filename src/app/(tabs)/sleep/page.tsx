'use client';

import { useEffect, useMemo, useState } from 'react';
import ActiveChildGate from '@/components/gates/ActiveChildGate';
import Header from '@/components/layout/Header';
import { SleepingBabyArt } from '@/components/illustrations/Illustrations';
import WakeWindowIndicator from '@/components/indicators/WakeWindowIndicator';
import SleepDurationIndicator from '@/components/indicators/SleepDurationIndicator';
// import SleepTimeline24h from '@/components/timeline/SleepTimeline24h';
import {
  computeWakeWindowModel,
  inferSleepKindByTime,
  getRunningSleepSession,
  startSleepSession,
  stopSleepSession,
} from '@/lib/repo';
import { getSleepErrorCode } from '@/lib/sleepRules';
import type { Child, SleepKind, SleepSession } from '@/lib/types';
import { formatDuration } from '@/lib/time';
import { useToast } from '@/components/feedback/useToast';

export default function SleepPage() {
  return <ActiveChildGate title="Сон">{(child) => <SleepScreen child={child} />}</ActiveChildGate>;
}

function SleepScreen({ child }: { child: Child }) {
  const [kind, setKind] = useState<SleepKind>('nap');
  const [running, setRunning] = useState<SleepSession | null>(null);
  const [now, setNow] = useState(Date.now());
  const [wakeStart, setWakeStart] = useState<number | null>(null);
  const [wwLow, setWwLow] = useState<number>(90 * 60 * 1000);
  const [wwHigh, setWwHigh] = useState<number>(110 * 60 * 1000);
  const [wwSamples, setWwSamples] = useState<number>(0);
  const { show, Toast } = useToast();

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
      setWakeStart(ww.lastWakeMs !== null ? Date.now() - ww.lastWakeMs : null);
    })();
  }, [child.id]);
  const sinceWake = useMemo(
    () => (wakeStart ? Math.max(0, now - wakeStart) : null),
    [wakeStart, now],
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = useMemo(() => {
    if (!running) return 0;
    return Math.max(0, now - running.start);
  }, [running, now]);

  const bedtimeHint = useMemo(() => {
    if (running) return null;
    if (sinceWake === null) return null;

    // Use the upper bound of the "optimal" corridor as an estimate.
    const target = wwHigh;
    const remaining = target - sinceWake;
    const isNow = remaining <= 0;
    return { remaining: Math.max(0, remaining), isNow, target };
  }, [sinceWake, running, wwHigh]);
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
    if (sinceWake === null) return false;
    return sinceWake >= wwHigh;
  }, [running, sinceWake, wwHigh]);

  return (
    <>
      <Header title="Сон" />

      <div className="stack">
        <div className="card stack" style={{ textAlign: 'center' }}>
          <div className="heroRow" style={{ justifyContent: 'center' }}>
            <div className="heroArt" aria-hidden>
              <SleepingBabyArt />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {running ? 'Сон идёт…' : 'Начать сон'}
              </div>
              <div className="small">Один тап — и запись готова</div>
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'center' }}>
            <span className={`pill ${kind === 'nap' ? '' : ''}`}>Тип</span>
            <select
              className="select"
              value={kind}
              onChange={(e) => setKind(toSleepKind(e.target.value))}
              disabled={!!running}
              style={{ maxWidth: 180 }}
            >
              <option value="nap">Дневной сон</option>
              <option value="night">Ночной сон</option>
            </select>
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
                  const s = await startSleepSession({ childId: child.id, kind: activeKind });
                  setRunning(s);
                  show('Сон начался');
                } else {
                  await stopSleepSession({ sessionId: running.id });
                  setRunning(null);
                  const ww = await computeWakeWindowModel(child.id, 7);
                  setWwLow(ww.low);
                  setWwHigh(ww.high);
                  setWwSamples(ww.sampleSize);
                  setWakeStart(ww.lastWakeMs !== null ? Date.now() - ww.lastWakeMs : null);
                  show('Сон завершён');
                }
              } catch (error: unknown) {
                const code = getSleepErrorCode(error);
                if (code === 'SLEEP_ACTIVE_EXISTS') {
                  show('Сон уже идёт — сначала остановите его');
                } else if (code === 'SLEEP_OVERLAP') {
                  show('Время пересекается с другой записью сна');
                } else {
                  show('Не получилось сохранить. Проверьте время.');
                }
              }
            }}
            aria-label={running ? 'Завершить сон' : 'Начать сон'}
          >
            <div className="sleepMainBtnIcon">
              {buttonVisual === 'ready' ? '🌙' : buttonVisual === 'wake' ? '⏰' : '💤'}
            </div>
            <div className="sleepMainBtnTitle">
              {buttonVisual === 'ready'
                ? 'Уложить'
                : buttonVisual === 'wake'
                  ? 'Пора просыпаться'
                  : 'Сон идёт'}
            </div>
            <div className="small" style={{ opacity: 0.92 }}>
              {running
                ? 'Нажмите, когда проснулся'
                : isBedtimeNow
                  ? 'Самое время укладывать'
                  : 'Нажмите, когда уснул'}
            </div>
          </button>

          <div style={{ fontSize: 44, fontWeight: 800, marginTop: 6 }}>
            {running
              ? formatDuration(elapsed)
              : sinceWake !== null
                ? formatDuration(sinceWake)
                : '—'}
          </div>

          {!running && sinceWake !== null ? (
            <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="pill">ВБ: {formatDuration(sinceWake)}</span>
              {bedtimeHint ? (
                bedtimeHint.isNow ? (
                  <span className="pill pillActive">Пора укладывать</span>
                ) : (
                  <span className="pill">До сна ~ {formatDuration(bedtimeHint.remaining)}</span>
                )
              ) : null}
            </div>
          ) : null}

          <div style={{ marginTop: 12, textAlign: 'left' }}>
            {running ? (
              <SleepDurationIndicator elapsedMs={elapsed} kind={activeKind} />
            ) : sinceWake !== null ? (
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
                  <div style={{ fontWeight: 900 }}>ВБ сейчас: —</div>
                  <span className="pill">Нет данных</span>
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
                  Запишите хотя бы 2 сна, чтобы мы рассчитали окна бодрствования.
                </div>
              </div>
            )}
          </div>

          {/* <div style={{ marginTop: 14, textAlign: 'left' }}>
            <SleepTimeline24h
              childId={child.id}
              nowMs={nowRoundedMin}
              refreshKey={`${running?.id ?? 'none'}:${running?.end ?? 'run'}`}
            />
          </div> */}

          <div className="small">Профиль: {child.name}</div>
        </div>
      </div>

      {Toast}
    </>
  );
}

function toSleepKind(value: string): SleepKind {
  return value === 'night' ? 'night' : 'nap';
}
