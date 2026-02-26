'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  computeWakeWindowModel,
  getActiveChild,
  getRunningSleepSession,
  inferSleepKindByTime,
  startSleepSession,
  stopSleepSession,
} from '@/lib/repo';
import type { Child, SleepSession } from '@/lib/types';
import { formatDuration } from '@/lib/time';
import WakeWindowIndicator from '@/components/WakeWindowIndicator';
import { useToast } from '@/components/useToast';

/**
 * Sticky bar shown on all screens.
 * - If sleep is running: shows timer + quick stop
 * - If not running: shows wake time + quick start
 * - Only quick action: start/stop sleep
 */
export default function StickyNowBar() {
  const [child, setChild] = useState<Child | null>(null);
  const [running, setRunning] = useState<SleepSession | null>(null);
  const [now, setNow] = useState(Date.now());
  // Mobile-first: start collapsed by default to avoid covering content.
  const [collapsed, setCollapsed] = useState(true);
  const [wwLow, setWwLow] = useState(90 * 60 * 1000);
  const [wwHigh, setWwHigh] = useState(110 * 60 * 1000);
  const [wwSamples, setWwSamples] = useState(0);
  const [wakeStart, setWakeStart] = useState<number | null>(null);

  const pathname = usePathname();
  const { show, Toast } = useToast();

  // Hide on Sleep page (it has its own large start/stop control) and on Profile.
  const isHiddenRoute = pathname?.startsWith('/profile') || pathname?.startsWith('/sleep');
  // keep visible on most other screens (including /growth)

  async function refreshData() {
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
    setWakeStart(ww.lastWakeMs !== null ? Date.now() - ww.lastWakeMs : null);
  }

  useEffect(() => {
    // persist collapsed state between sessions
    try {
      const v = window.localStorage.getItem('stickyNowCollapsed');
      // Default to collapsed when value is missing.
      setCollapsed(v !== '0');
    } catch {}

    refreshData();
    // refresh on focus
    const onFocus = () => refreshData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // lightweight polling to reflect changes across tabs/actions
  useEffect(() => {
    const t = setInterval(() => {
      refreshData();
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elapsed = useMemo(() => {
    if (!running) return 0;
    return Math.max(0, now - running.start);
  }, [running, now]);

  const sinceWake = useMemo(
    () => (wakeStart ? Math.max(0, now - wakeStart) : null),
    [wakeStart, now],
  );

  const hint = useMemo(() => {
    if (running) return null;
    if (sinceWake === null) return null;
    const remaining = wwHigh - sinceWake;
    return { isNow: remaining <= 0, remaining: Math.max(0, remaining) };
  }, [running, sinceWake, wwHigh]);

  if (isHiddenRoute) return null;
  if (!child) return null;

  if (collapsed) {
    return (
      <div className="stickyPin" aria-label="Открыть быстрые действия">
        <button
          className="stickyPinBtn"
          onClick={() => {
            setCollapsed(false);
            try {
              window.localStorage.setItem('stickyNowCollapsed', '0');
            } catch {}
          }}
          aria-label="Открыть панель"
          title="Открыть"
        >
          ❯
        </button>
        {Toast}
      </div>
    );
  }

  return (
    <div className="stickyNow" aria-label="Быстрые действия">
      <div className="stickyNowInner">
        <div className="stickyNowCard">
          <div className="stickyNowTop">
            <div style={{ minWidth: 0 }}>
              <div className="stickyNowTitle">
                {running
                  ? `Сон идёт · ${formatDuration(elapsed)}`
                  : `ВБ · ${sinceWake !== null ? formatDuration(sinceWake) : '—'}`}
              </div>
              <div
                className="stickyNowSub"
                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {running
                  ? `${child.name} · нажмите стоп, когда проснётся`
                  : hint
                    ? hint.isNow
                      ? `Пора укладывать · окно ${formatDuration(wwLow)}—${formatDuration(wwHigh)} (${wwSamples})`
                      : `До сна ~ ${formatDuration(hint.remaining)} · окно ${formatDuration(wwLow)}—${formatDuration(wwHigh)} (${wwSamples})`
                    : `${child.name}`}
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
                      show('Сон завершён');
                    } else {
                      const kind = inferSleepKindByTime(Date.now());
                      const s = await startSleepSession({ childId: child.id, kind });
                      setRunning(s);
                      show('Сон начался');
                    }
                  } catch (e: any) {
                    const code = e?.code;
                    if (code === 'SLEEP_ACTIVE_EXISTS') show('Сон уже идёт');
                    else if (code === 'SLEEP_OVERLAP') show('Пересечение по времени');
                    else show('Не получилось выполнить действие');
                  }
                }}
                aria-label={running ? 'Остановить сон' : 'Начать сон'}
                title={running ? 'Стоп' : 'Старт'}
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
              aria-label="Свернуть панель"
              title="Свернуть"
            >
              ❮
            </button>
          </div>

          {!running && sinceWake !== null ? (
            <div className="stickyNowBar">
              <WakeWindowIndicator
                sinceWakeMs={sinceWake}
                lowMs={wwLow}
                highMs={wwHigh}
                sampleSize={wwSamples}
                compact
              />
            </div>
          ) : null}
        </div>
      </div>
      {Toast}
    </div>
  );
}
