'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  computeWakeWindowModel,
  getActiveChild,
  getRunningSleepSession,
  inferSleepKindByTime,
  startSleepSession,
  stopSleepSession,
} from '@/lib/repo';
import { getSleepErrorCode } from '@/lib/sleepRules';
import type { Child, SleepSession } from '@/lib/types';
import WakeWindowIndicator from '@/components/indicators/WakeWindowIndicator';
import { useToast } from '@/components/feedback/useToast';
import { useI18n } from '@/lib/i18n';

/**
 * Sticky bar shown on all screens.
 * - If sleep is running: shows timer + quick stop
 * - If not running: shows wake time + quick start
 * - Only quick action: start/stop sleep
 */
export default function StickyNowBar() {
  const minDaysForSmartScale = 3;
  const [child, setChild] = useState<Child | null>(null);
  const [running, setRunning] = useState<SleepSession | null>(null);
  const [now, setNow] = useState(Date.now());
  // Mobile-first: start collapsed by default to avoid covering content.
  const [collapsed, setCollapsed] = useState(true);
  const [wwLow, setWwLow] = useState(90 * 60 * 1000);
  const [wwHigh, setWwHigh] = useState(110 * 60 * 1000);
  const [wwSamples, setWwSamples] = useState(0);
  const [wwDaysWithData, setWwDaysWithData] = useState(0);
  const [wakeStart, setWakeStart] = useState<number | null>(null);

  const pathname = usePathname();
  const { show, Toast } = useToast();
  const { t, formatDurationValue } = useI18n();

  // Hide on Sleep page (it has its own large start/stop control) and on Profile.
  const isHiddenRoute = pathname?.startsWith('/profile') || pathname?.startsWith('/sleep');

  const refreshData = useCallback(async () => {
    const c = await getActiveChild();
    setChild(c ?? null);
    if (!c) {
      setRunning(null);
      return;
    }

    const r = await getRunningSleepSession(c.id);
    setRunning(r ?? null);

    const ww = await computeWakeWindowModel(c.id, 7);
    setWwLow(ww.low);
    setWwHigh(ww.high);
    setWwSamples(ww.sampleSize);
    setWwDaysWithData(ww.daysWithData);
    setWakeStart(ww.lastWakeMs !== null ? Date.now() - ww.lastWakeMs : null);
  }, []);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem('stickyNowCollapsed');
      setCollapsed(v !== '0');
    } catch {}

    refreshData();
    const onFocus = () => refreshData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshData]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      refreshData();
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshData]);

  const elapsed = useMemo(() => {
    if (!running) return 0;
    return Math.max(0, now - running.start);
  }, [running, now]);

  const sinceWake = useMemo(
    () => (wakeStart ? Math.max(0, now - wakeStart) : null),
    [wakeStart, now],
  );

  const hasSmartWakeScale = wwDaysWithData >= minDaysForSmartScale;

  const hint = useMemo(() => {
    if (running) return null;
    if (!hasSmartWakeScale) return null;
    if (sinceWake === null) return null;

    const remaining = wwHigh - sinceWake;
    return { isNow: remaining <= 0, remaining: Math.max(0, remaining) };
  }, [running, sinceWake, wwHigh, hasSmartWakeScale]);

  if (isHiddenRoute || !child) return null;

  if (collapsed) {
    return (
      <div className="stickyPin" aria-label={t('sticky.openQuickActions')}>
        <button
          className="stickyPinBtn"
          onClick={() => {
            setCollapsed(false);
            try {
              window.localStorage.setItem('stickyNowCollapsed', '0');
            } catch {}
          }}
          aria-label={t('sticky.openPanel')}
          title={t('sticky.open')}
        >
          ❮❮
        </button>
        {Toast}
      </div>
    );
  }

  return (
    <div className="stickyNow" aria-label={t('sticky.quickActions')}>
      <div className="stickyNowInner">
        <div className="stickyNowCard">
          <div className="stickyNowTop">
            <div style={{ minWidth: 0 }}>
              <div className="stickyNowTitle">
                {running
                  ? t('sticky.runningTitle', { duration: formatDurationValue(elapsed) })
                  : t('sticky.wakeTitle', {
                      duration: sinceWake !== null ? formatDurationValue(sinceWake) : '—',
                    })}
              </div>
              <div
                className="stickyNowSub"
                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {running
                  ? t('sticky.runningSub', { name: child.name })
                  : hint
                    ? hint.isNow
                      ? t('sticky.hintNow', {
                          low: formatDurationValue(wwLow),
                          high: formatDurationValue(wwHigh),
                          samples: wwSamples,
                        })
                      : t('sticky.hintUntil', {
                          remaining: formatDurationValue(hint.remaining),
                          low: formatDurationValue(wwLow),
                          high: formatDurationValue(wwHigh),
                          samples: wwSamples,
                        })
                    : sinceWake !== null && !hasSmartWakeScale
                      ? t('sticky.hintNeedData')
                      : child.name}
              </div>
            </div>

            <div className="stickyNowActions">
              <button
                className={`iconBtn ${running ? 'iconBtnDanger' : 'iconBtnPrimary'}`}
                onClick={async () => {
                  try {
                    if (running) {
                      await stopSleepSession({ sessionId: running.id });
                      setRunning(null);
                      await refreshData();
                      show(t('sticky.toastStopped'));
                    } else {
                      const kind = inferSleepKindByTime(Date.now());
                      const session = await startSleepSession({ childId: child.id, kind });
                      setRunning(session);
                      show(t('sticky.toastStarted'));
                    }
                  } catch (error: unknown) {
                    const code = getSleepErrorCode(error);
                    if (code === 'SLEEP_ACTIVE_EXISTS') show(t('sticky.errorAlreadyRunning'));
                    else if (code === 'SLEEP_OVERLAP') show(t('sticky.errorOverlap'));
                    else show(t('sticky.errorAction'));
                  }
                }}
                aria-label={running ? t('sticky.ariaStop') : t('sticky.ariaStart')}
                title={running ? t('sticky.stop') : t('sticky.start')}
              >
                {running ? '⏹' : '▶'}
              </button>
            </div>

            <button
              className="stickyCollapseBtn"
              onClick={() => {
                setCollapsed(true);
                try {
                  window.localStorage.setItem('stickyNowCollapsed', '1');
                } catch {}
              }}
              aria-label={t('sticky.collapsePanel')}
              title={t('sticky.collapse')}
            >
              ❯❯
            </button>
          </div>

          {!running && sinceWake !== null && hasSmartWakeScale ? (
            <div className="stickyNowBar">
              <WakeWindowIndicator
                sinceWakeMs={sinceWake}
                lowMs={wwLow}
                highMs={wwHigh}
                sampleSize={wwSamples}
                compact
              />
            </div>
          ) : !running && sinceWake !== null ? (
            <div className="stickyNowBar">
              <div className="small" style={{ opacity: 0.92 }}>
                {t('sticky.needDataScale', {
                  filled: wwDaysWithData,
                  total: minDaysForSmartScale,
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {Toast}
    </div>
  );
}
