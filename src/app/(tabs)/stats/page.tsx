'use client';

import { useEffect, useMemo, useState } from 'react';
import ActiveChildGate from '@/components/ActiveChildGate';
import Header from '@/components/Header';
import { SleepingBabyArt } from '@/components/Illustrations';
import {
  computeWakeWindowModel,
  dismissInsightForToday,
  getInsightDismissedYmd,
  listSleepSessionsInRange,
} from '@/lib/repo';
import type { Child, SleepSession } from '@/lib/types';
import { formatDuration, startOfDayMs, toYmd } from '@/lib/time';
import { generateDailyInsight } from '@/lib/insights';
import { useToast } from '@/components/useToast';

export default function StatsPage() {
  return (
    <ActiveChildGate title="Статистика">{(child) => <StatsScreen child={child} />}</ActiveChildGate>
  );
}

function StatsScreen({ child }: { child: Child }) {
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [wwLow, setWwLow] = useState(90 * 60 * 1000);
  const [wwHigh, setWwHigh] = useState(110 * 60 * 1000);
  const [wwSamples, setWwSamples] = useState(0);
  const [dismissedYmd, setDismissedYmd] = useState<string | undefined>(undefined);
  const { show, Toast } = useToast();

  useEffect(() => {
    (async () => {
      const now = new Date();
      const end = Date.now();
      const start = startOfDayMs(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
      const list = await listSleepSessionsInRange(child.id, start, end);
      setSessions(list);

      const ww = await computeWakeWindowModel(child.id, 7);
      setWwLow(ww.low);
      setWwHigh(ww.high);
      setWwSamples(ww.sampleSize);
      setDismissedYmd(await getInsightDismissedYmd());
    })();
  }, [child.id]);

  const todayYmd = useMemo(() => toYmd(new Date()), []);

  const insight = useMemo(() => {
    return generateDailyInsight({
      childName: child.name,
      sessions,
      nowMs: Date.now(),
      wwLowMs: wwLow,
      wwHighMs: wwHigh,
      wwSamples,
    });
  }, [child.name, sessions, wwLow, wwHigh, wwSamples]);

  const computed = useMemo(() => {
    const now = Date.now();
    const byDay = new Map<string, number>();
    const byDayNap = new Map<string, number>();
    const byDayNight = new Map<string, number>();

    let longest = 0;

    const sorted = [...sessions].sort((a, b) => a.start - b.start);
    const wakeWindows: number[] = [];

    for (const s of sessions) {
      const end = s.end ?? now;
      const dur = Math.max(0, end - s.start);
      if (dur > longest) longest = dur;

      const d = new Date(s.start);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      byDay.set(key, (byDay.get(key) ?? 0) + dur);
      if (s.kind === 'night') byDayNight.set(key, (byDayNight.get(key) ?? 0) + dur);
      else byDayNap.set(key, (byDayNap.get(key) ?? 0) + dur);
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]!;
      const b = sorted[i + 1]!;
      const aEnd = a.end ?? now;
      if (aEnd < b.start) wakeWindows.push(b.start - aEnd);
    }

    const total = Array.from(byDay.values()).reduce((acc, v) => acc + v, 0);
    const avg = byDay.size ? total / byDay.size : 0;

    const wwAvg = wakeWindows.length
      ? wakeWindows.reduce((a, b) => a + b, 0) / wakeWindows.length
      : 0;

    // Last 24h
    const t24Start = now - 24 * 60 * 60 * 1000;
    const last24 = sessions
      .map((s) => {
        const sEnd = s.end ?? now;
        const a = Math.max(s.start, t24Start);
        const b = Math.min(sEnd, now);
        return { ...s, dur: Math.max(0, b - a) };
      })
      .filter((s) => s.dur > 0);
    const last24Sleep = last24.reduce((acc, s) => acc + s.dur, 0);
    const last24Nap = last24.filter((s) => s.kind === 'nap').reduce((acc, s) => acc + s.dur, 0);
    const last24Night = last24.filter((s) => s.kind === 'night').reduce((acc, s) => acc + s.dur, 0);

    const days = Array.from(byDay.keys()).sort();
    return {
      avgSleepPerDay: avg,
      avgWakeWindow: wwAvg,
      longest,
      days,
      byDay,
      byDayNap,
      byDayNight,
      last24Sleep,
      last24Nap,
      last24Night,
    };
  }, [sessions]);

  return (
    <>
      <Header title="Статистика" />

      <div className="stack">
        {sessions.length === 0 ? (
          <div className="card">
            <div className="heroRow">
              <div className="heroArt" aria-hidden>
                <SleepingBabyArt />
              </div>
              <div>
                <div style={{ fontWeight: 900 }}>Пока нет данных</div>
                <div className="small">
                  Начните трекать сон — нажмите большую кнопку на вкладке «Сон». Затем здесь
                  появятся сводка за 24 часа и статистика за 7 дней.
                </div>
                <div style={{ marginTop: 10 }}>
                  <a className="button buttonPrimary" href="/sleep">
                    Перейти к сну
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {dismissedYmd !== todayYmd ? (
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 900 }}>{insight.title}</div>
              <button
                className="button"
                onClick={async () => {
                  await dismissInsightForToday(todayYmd);
                  setDismissedYmd(todayYmd);
                  show('Скрыто на сегодня');
                }}
              >
                Скрыть
              </button>
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              {insight.text}
            </div>
          </div>
        ) : null}

        <div className="card kpi">
          <div className="kpiLabel">Последние 24 часа</div>
          <div className="kpiValue">
            {computed.last24Sleep ? formatDuration(computed.last24Sleep) : '—'}
          </div>
          <div className="small">
            Дн: {formatDuration(computed.last24Nap)} · Ночь: {formatDuration(computed.last24Night)}
          </div>
        </div>

        <div className="card kpi">
          <div className="kpiLabel">Средний сон за день (последние 7 дней)</div>
          <div className="kpiValue">
            {computed.avgSleepPerDay ? formatDuration(computed.avgSleepPerDay) : '—'}
          </div>
        </div>

        <div className="card kpi">
          <div className="kpiLabel">Бодрствование (среднее между снами)</div>
          <div className="kpiValue">
            {computed.avgWakeWindow ? formatDuration(computed.avgWakeWindow) : '—'}
          </div>
        </div>

        <div className="card kpi">
          <div className="kpiLabel">Самый долгий сон (последние 7 дней)</div>
          <div className="kpiValue">
            {computed.longest ? formatDuration(computed.longest) : '—'}
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Сон по дням (7 дней)</div>
          <div className="small" style={{ display: 'grid', gap: 6 }}>
            {computed.days.length === 0 ? (
              <div>Пока нет данных.</div>
            ) : (
              computed.days.slice(-7).map((d) => {
                const total = computed.byDay.get(d) ?? 0;
                const nap = computed.byDayNap.get(d) ?? 0;
                const night = computed.byDayNight.get(d) ?? 0;
                return (
                  <div key={d} className="row" style={{ justifyContent: 'space-between' }}>
                    <span>{d}</span>
                    <span>
                      {formatDuration(total)} · дн {formatDuration(nap)} · ночь{' '}
                      {formatDuration(night)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {Toast}
    </>
  );
}
