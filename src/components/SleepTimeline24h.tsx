// src/components/SleepTimeline24h.tsx
'use client';

import React, { useMemo, useState } from 'react';

export type SleepType = 'day' | 'night';

export type SleepSession = {
  id: string;
  startAt: string; // ISO datetime
  endAt: string | null; // null = active
  type: SleepType;
  tags?: string[] | null;
  note?: string | null;
};

type Props = {
  sessions: SleepSession[]; // sessions for the selected child (can be more than today)
  selectedDate?: Date; // defaults to today (local)
  className?: string;
  /** Optional: called when user selects a segment */
  onSelectSessionId?: (id: string | null) => void;
};

type Segment = {
  id: string;
  type: SleepType;
  isActive: boolean;
  // For rendering (clamped to the day)
  startMsClamped: number;
  endMsClamped: number;
  // For details (real values, not clamped)
  startIso: string;
  endIso: string | null;
  tags: string[];
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatRange(startIso: string, endIso: string | null) {
  const s = new Date(startIso);
  if (!endIso) return `${formatTime(s)} — сейчас`;
  const e = new Date(endIso);
  return `${formatTime(s)} — ${formatTime(e)}`;
}

function minutesBetween(aMs: number, bMs: number) {
  return Math.max(0, Math.round((bMs - aMs) / 60000));
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}м`;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDayExclusive(date: Date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function clamp(ms: number, min: number, max: number) {
  return Math.min(max, Math.max(min, ms));
}

export default function SleepTimeline24h({
  sessions,
  selectedDate,
  className,
  onSelectSessionId,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dayStart = useMemo(() => startOfDay(selectedDate ?? new Date()).getTime(), [selectedDate]);
  const dayEnd = useMemo(
    () => endOfDayExclusive(selectedDate ?? new Date()).getTime(),
    [selectedDate],
  );

  const segments = useMemo<Segment[]>(() => {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    return (sessions ?? [])
      .map((s) => {
        const startMs = new Date(s.startAt).getTime();
        const endMs = s.endAt ? new Date(s.endAt).getTime() : nowMs;

        // If it doesn't intersect with the day, skip.
        const intersects = startMs < dayEnd && endMs > dayStart;
        if (!intersects) return null;

        const startMsClamped = clamp(startMs, dayStart, dayEnd);
        const endMsClamped = clamp(endMs, dayStart, dayEnd);

        // If clamp results in zero length, skip.
        if (endMsClamped <= startMsClamped) return null;

        return {
          id: s.id,
          type: s.type,
          isActive: s.endAt === null,
          startMsClamped,
          endMsClamped,
          startIso: s.startAt,
          endIso: s.endAt ? s.endAt : nowIso,
          tags: (s.tags ?? []).filter(Boolean),
        } satisfies Segment;
      })
      .filter(Boolean) as Segment[];
  }, [sessions, dayStart, dayEnd]);

  const selected = useMemo(
    () => segments.find((x) => x.id === selectedId) ?? null,
    [segments, selectedId],
  );

  // Hours marks: 0,3,6,9,12,15,18,21,24
  const hourMarks = useMemo(() => [0, 3, 6, 9, 12, 15, 18, 21, 24], []);

  function handleSelect(id: string | null) {
    setSelectedId(id);
    onSelectSessionId?.(id);
  }

  return (
    <div className={className}>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-white/90">Сон за день (00:00–24:00)</div>

          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="text-xs text-white/60 hover:text-white/90"
          >
            Сбросить
          </button>
        </div>

        {/* timeline */}
        <div className="relative">
          {/* Background bar */}
          <div className="h-12 w-full rounded-xl bg-black/20 ring-1 ring-white/10" />

          {/* Segments */}
          <div className="pointer-events-none absolute inset-0">
            {segments.map((seg) => {
              const leftPct = ((seg.startMsClamped - dayStart) / (dayEnd - dayStart)) * 100;
              const widthPct =
                ((seg.endMsClamped - seg.startMsClamped) / (dayEnd - dayStart)) * 100;

              const isSelected = seg.id === selectedId;

              // Colors: night = blue-ish, day = purple-ish
              const base = seg.type === 'night' ? 'bg-indigo-400/70' : 'bg-violet-400/70';

              const activePulse = seg.isActive ? 'animate-pulse' : 'opacity-100';

              const selectedRing = isSelected
                ? 'ring-2 ring-white/80 shadow-[0_0_0_4px_rgba(167,139,250,0.20)]'
                : 'ring-0';

              return (
                <div
                  key={seg.id}
                  className={[
                    'absolute top-1.5 h-9 rounded-lg',
                    base,
                    activePulse,
                    selectedRing,
                  ].join(' ')}
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                />
              );
            })}
          </div>

          {/* Click layer */}
          <div className="absolute inset-0 z-10">
            {segments.map((seg) => {
              const leftPct = ((seg.startMsClamped - dayStart) / (dayEnd - dayStart)) * 100;
              const widthPct =
                ((seg.endMsClamped - seg.startMsClamped) / (dayEnd - dayStart)) * 100;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => handleSelect(seg.id)}
                  className="absolute top-0 h-12"
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(widthPct, 1)}%`,
                  }}
                  aria-label="Показать детали сна"
                />
              );
            })}
          </div>

          {/* Hour marks */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/55">
            {hourMarks.map((h) => (
              <div key={h} className="flex flex-col items-center">
                <div className="h-1.5 w-px bg-white/20" />
                <div className="mt-1">{h}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tap hint */}
        {!selected && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
            Нажмите на отрезок сна, чтобы увидеть точное время и длительность.
          </div>
        )}

        {/* Details */}
        {selected && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white/90">
                  {formatRange(selected.startIso, selected.endIso)}
                </div>
                <div className="mt-0.5 text-xs text-white/60">
                  {selected.type === 'night' ? 'Ночной сон' : 'Дневной сон'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/15"
              >
                Скрыть
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/85">
                Длительность:{' '}
                <span className="font-semibold">
                  {formatDuration(
                    minutesBetween(
                      new Date(selected.startIso).getTime(),
                      new Date(selected.endIso ?? new Date().toISOString()).getTime(),
                    ),
                  )}
                </span>
              </div>

              {selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/75"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 text-[11px] text-white/55">
              * На графике сон может быть “обрезан” границами дня, но выше отображается реальное
              время.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
