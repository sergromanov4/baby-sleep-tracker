'use client';

import { useEffect, useMemo, useState } from 'react';
import ActiveChildGate from '@/components/gates/ActiveChildGate';
import { SleepingBabyArt } from '@/components/illustrations/Illustrations';
import { listSleepSessionsInRange } from '@/lib/repo';
import type { Child, SleepSession } from '@/lib/types';
import { formatTime, fromYmd, startOfDayMs, toYmd } from '@/lib/time';
import { useI18n } from '@/lib/i18n';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function StatsPage() {
  return <ActiveChildGate>{(child) => <StatsScreen child={child} />}</ActiveChildGate>;
}

function StatsScreen({ child }: { child: Child }) {
  const [dateYmd, setDateYmd] = useState(() => toYmd(new Date()));
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { t, formatDurationValue } = useI18n();

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      const dayStart = startOfDayMs(fromYmd(dateYmd));
      const dayEndExclusive = dayStart + DAY_MS;
      const list = await listSleepSessionsInRange(child.id, dayStart, dayEndExclusive);
      setSessions(list);
    })();
  }, [child.id, dateYmd]);

  const computed = useMemo(() => {
    const dayStart = startOfDayMs(fromYmd(dateYmd));
    const dayEndExclusive = dayStart + DAY_MS;
    const statsEndExclusive = getStatsEndExclusive(dayStart, dayEndExclusive, nowMs);

    const resolvedSessions = sessions
      .map((session) => {
        const end = Math.min(session.end ?? nowMs, nowMs);
        return { ...session, resolvedEnd: end, dur: Math.max(0, end - session.start) };
      })
      .filter((session) => session.dur > 0);

    const attributedSleep = resolvedSessions
      .filter((session) => session.start >= dayStart && session.start < dayEndExclusive)
      .sort((a, b) => a.start - b.start);

    const sleepIntervalsForWake = resolvedSessions
      .map((session) => {
        const start = Math.max(session.start, dayStart);
        const end = Math.min(session.resolvedEnd, statsEndExclusive);
        return { start, end, dur: Math.max(0, end - start) };
      })
      .filter((interval) => interval.dur > 0)
      .sort((a, b) => a.start - b.start);

    const mergedSleep: Array<{ start: number; end: number }> = [];
    for (const interval of sleepIntervalsForWake) {
      const prev = mergedSleep[mergedSleep.length - 1];
      if (!prev || interval.start > prev.end) {
        mergedSleep.push({ start: interval.start, end: interval.end });
      } else {
        prev.end = Math.max(prev.end, interval.end);
      }
    }

    const wakeWindows: number[] = [];
    let cursor = dayStart;
    for (const interval of mergedSleep) {
      if (interval.start > cursor) wakeWindows.push(interval.start - cursor);
      cursor = Math.max(cursor, interval.end);
    }
    if (cursor < statsEndExclusive) wakeWindows.push(statsEndExclusive - cursor);

    const totalSleep = attributedSleep.reduce((acc, session) => acc + session.dur, 0);
    const totalWake = wakeWindows.reduce((acc, dur) => acc + dur, 0);

    const avgWake = wakeWindows.length
      ? wakeWindows.reduce((acc, dur) => acc + dur, 0) / wakeWindows.length
      : 0;

    const naps = attributedSleep.filter((session) => session.kind === 'nap');
    const avgNapSleep = naps.length ? naps.reduce((acc, nap) => acc + nap.dur, 0) / naps.length : 0;

    const dayStartWake = findDayStartWakeTime(sessions, dayStart, dayEndExclusive);
    const nightSleepStart = sessions
      .filter(
        (session) =>
          session.kind === 'night' && session.start >= dayStart && session.start < dayEndExclusive,
      )
      .sort((a, b) => a.start - b.start)[0]?.start;

    return {
      hasData: attributedSleep.length > 0 || wakeWindows.length > 0,
      totalWake,
      totalSleep,
      avgWake,
      avgNapSleep,
      dayStartWake: dayStartWake ?? null,
      nightSleepStart: nightSleepStart ?? null,
    };
  }, [dateYmd, nowMs, sessions]);

  return (
    <>
      <div className="stack">
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900 }}>{t('stats.date')}</div>
            <input
              className="input"
              type="date"
              value={dateYmd}
              onChange={(e) => setDateYmd(e.target.value)}
              style={{ maxWidth: 170 }}
            />
          </div>
          <div className="small">{child.name}</div>
        </div>

        {!computed.hasData ? (
          <div className="card">
            <div className="heroRow">
              <div className="heroArt" aria-hidden>
                <SleepingBabyArt />
              </div>
              <div>
                <div style={{ fontWeight: 900 }}>{t('stats.noDataTitle')}</div>
                <div className="small">{t('stats.noDataText')}</div>
              </div>
            </div>
          </div>
        ) : null}

        {computed.hasData ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            <StatTile
              title={t('stats.totalWake')}
              value={formatDurationValue(computed.totalWake)}
            />
            <StatTile
              title={t('stats.totalSleep')}
              value={formatDurationValue(computed.totalSleep)}
            />
            <StatTile
              title={t('stats.avgWake')}
              value={computed.avgWake ? formatDurationValue(computed.avgWake) : '—'}
            />
            <StatTile
              title={t('stats.avgNapSleep')}
              value={computed.avgNapSleep ? formatDurationValue(computed.avgNapSleep) : '—'}
            />
            <StatTile
              title={t('stats.dayStart')}
              value={computed.dayStartWake !== null ? formatTime(computed.dayStartWake) : '—'}
            />
            <StatTile
              title={t('stats.nightStart')}
              value={computed.nightSleepStart !== null ? formatTime(computed.nightSleepStart) : '—'}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

function getStatsEndExclusive(dayStart: number, dayEndExclusive: number, nowMs: number): number {
  if (nowMs <= dayStart) return dayStart;
  if (nowMs >= dayEndExclusive) return dayEndExclusive;
  return nowMs;
}

function findDayStartWakeTime(
  sessions: SleepSession[],
  dayStart: number,
  dayEndExclusive: number,
): number | undefined {
  const morningNightWake = sessions
    .filter(
      (session): session is SleepSession & { end: number } =>
        session.kind === 'night' &&
        typeof session.end === 'number' &&
        session.end >= dayStart &&
        session.end < dayEndExclusive,
    )
    .sort((a, b) => a.end - b.end)[0]?.end;

  if (typeof morningNightWake === 'number') return morningNightWake;

  return sessions
    .filter(
      (session): session is SleepSession & { end: number } =>
        typeof session.end === 'number' && session.end >= dayStart && session.end < dayEndExclusive,
    )
    .sort((a, b) => a.end - b.end)[0]?.end;
}

function StatTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="card kpi" style={{ minHeight: 116 }}>
      <div className="kpiLabel">{title}</div>
      <div className="kpiValue">{value}</div>
    </div>
  );
}
