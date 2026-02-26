'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ActiveChildGate from '@/components/ActiveChildGate';
import Header from '@/components/Header';
import { AwakeBabyArt } from '@/components/Illustrations';
import WakeWindowIndicator from '@/components/WakeWindowIndicator';
import {
  createSleepSessionManual,
  deleteSleepSession,
  computeWakeWindowModel,
  getDayRangeMode,
  getUndo,
  inferSleepKindByTime,
  listSleepSessionsInRange,
  setDayRangeMode,
  undoLastAction,
  updateSleepSession,
} from '@/lib/repo';
import type { Child, SleepKind, SleepSession } from '@/lib/types';
import { endOfDayMs, formatDuration, formatTime, startOfDayMs, toYmd } from '@/lib/time';
import { useToast } from '@/components/useToast';

const TAGS = [
  'На руках',
  'В коляске',
  'В машине',
  'Соска',
  'Кормление',
  'Плачет',
  'Шум',
  'Темно',
  'Светло',
];

export default function DayPage() {
  return <ActiveChildGate title="День">{(child) => <DayScreen child={child} />}</ActiveChildGate>;
}

function DayScreen({ child }: { child: Child }) {
  const router = useRouter();
  const search = useSearchParams();
  const [dateYmd, setDateYmd] = useState(() => toYmd(new Date()));
  const [rangeMode, setRangeMode] = useState<'today' | 'last24'>('today');
  const [items, setItems] = useState<SleepSession[]>([]);
  const [editing, setEditing] = useState<SleepSession | null>(null);
  const [undoAvail, setUndoAvail] = useState(false);
  const [wwLow, setWwLow] = useState<number>(90 * 60 * 1000);
  const [wwHigh, setWwHigh] = useState<number>(110 * 60 * 1000);
  const [wwSamples, setWwSamples] = useState<number>(0);
  const { show, Toast } = useToast();

  useEffect(() => {
    (async () => {
      const m = await getDayRangeMode();
      setRangeMode(m);
      setUndoAvail(!!(await getUndo()));
    })();
  }, [child.id]);

  const dayStart = useMemo(() => {
    if (rangeMode === 'last24') return Date.now() - 24 * 60 * 60 * 1000;
    return startOfDayMs(new Date(dateYmd));
  }, [dateYmd, rangeMode]);

  const dayEnd = useMemo(() => {
    if (rangeMode === 'last24') return Date.now();
    return endOfDayMs(new Date(dateYmd));
  }, [dateYmd, rangeMode]);

  async function refresh() {
    const list = await listSleepSessionsInRange(child.id, dayStart, dayEnd);
    setItems(list);
    setUndoAvail(!!(await getUndo()));

    // Update wake-window corridor (used for the indicator)
    const ww = await computeWakeWindowModel(child.id, 7);
    setWwLow(ww.low);
    setWwHigh(ww.high);
    setWwSamples(ww.sampleSize);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id, dayStart, dayEnd]);

  // Quick action: open "add manual sleep" editor when navigated with ?addSleep=1
  useEffect(() => {
    const addSleep = search?.get('addSleep');
    if (addSleep !== '1') return;
    const start = Date.now();
    setEditing({
      id: 'new',
      childId: child.id,
      kind: inferSleepKindByTime(start),
      start,
      end: start + 45 * 60 * 1000,
      createdAt: start,
      updatedAt: start,
      tags: [],
    });
    // remove param to avoid re-opening
    router.replace('/day');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id]);

  const rows = useMemo(() => {
    // Split overlaps with day boundaries for display
    return items.map((s) => {
      const end = s.end ?? Date.now();
      const startClamped = Math.max(s.start, dayStart);
      const endClamped = Math.min(end, dayEnd);
      return { ...s, startClamped, endClamped, dur: Math.max(0, endClamped - startClamped) };
    });
  }, [items, dayStart, dayEnd]);

  const wakeWindows = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.start - b.start);
    const windows: Array<{ from: number; to: number; dur: number }> = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]!;
      const b = sorted[i + 1]!;
      const aEnd = a.end ?? Date.now();
      if (aEnd < b.start) {
        windows.push({ from: aEnd, to: b.start, dur: b.start - aEnd });
      }
    }
    return windows;
  }, [items]);

  const summary = useMemo(() => {
    const now = Date.now();
    let total = 0;
    let nap = 0;
    let night = 0;
    for (const s of rows) {
      const end = s.end ?? now;
      const dur = Math.max(0, Math.min(end, dayEnd) - Math.max(s.start, dayStart));
      total += dur;
      if (s.kind === 'night') night += dur;
      else nap += dur;
    }
    const last = [...items].sort((a, b) => (a.end ?? now) - (b.end ?? now)).at(-1);
    const lastEnd = last?.end ?? null;
    const sinceWake = lastEnd ? Math.max(0, now - lastEnd) : null;
    return { total, nap, night, count: items.length, sinceWake };
  }, [rows, items, dayStart, dayEnd]);

  return (
    <>
      <Header
        title="День"
        right={
          undoAvail ? (
            <button
              className="button"
              onClick={async () => {
                await undoLastAction();
                await refresh();
                show('Отменено');
              }}
            >
              ↩︎ Undo
            </button>
          ) : null
        }
      />

      <div className="stack">
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800 }}>
                {rangeMode === 'last24' ? 'Последние 24 часа' : 'День'}
              </div>
              <div className="small">{child.name}</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <select
                className="select"
                value={rangeMode}
                onChange={async (e) => {
                  const v = e.target.value as 'today' | 'last24';
                  setRangeMode(v);
                  await setDayRangeMode(v);
                }}
                style={{ maxWidth: 170 }}
              >
                <option value="today">По дням</option>
                <option value="last24">Последние 24ч</option>
              </select>
              {rangeMode === 'today' ? (
                <input
                  className="input"
                  type="date"
                  value={dateYmd}
                  onChange={(e) => setDateYmd(e.target.value)}
                  style={{ maxWidth: 160 }}
                />
              ) : null}
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <div className="pill">Сон: {formatDuration(summary.total)}</div>
            <div className="pill">Дн: {formatDuration(summary.nap)}</div>
            <div className="pill">Ночь: {formatDuration(summary.night)}</div>
          </div>
          {summary.sinceWake !== null ? (
            <div className="small">Сейчас ВБ: {formatDuration(summary.sinceWake)}</div>
          ) : null}

          {summary.sinceWake !== null ? (
            <div style={{ marginTop: 10 }}>
              <WakeWindowIndicator
                sinceWakeMs={summary.sinceWake}
                lowMs={wwLow}
                highMs={wwHigh}
                sampleSize={wwSamples}
              />
            </div>
          ) : null}

          <div className="list">
            {rows.length === 0 ? (
              <div className="empty">
                <div className="emptyTitle">Пока нет записей сна</div>
                <div className="emptyText">
                  Начните с большого круга на вкладке «Сон» или добавьте сон вручную.
                </div>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <a className="button" href="/sleep">
                    Перейти к сну
                  </a>
                  <button
                    className="button buttonPrimary"
                    onClick={() => {
                      const start = Date.now();
                      setEditing({
                        id: 'new',
                        childId: child.id,
                        kind: inferSleepKindByTime(start),
                        start,
                        end: start + 45 * 60 * 1000,
                        createdAt: start,
                        updatedAt: start,
                        tags: [],
                      });
                    }}
                  >
                    ＋ Добавить сон
                  </button>
                </div>
              </div>
            ) : null}
            {rows.map((s) => {
              const end = s.end ?? Date.now();
              return (
                <div
                  key={s.id}
                  className="listItem"
                  onClick={() => setEditing(s)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div className="listItemTitle">
                      {s.kind === 'night' ? 'Ночь' : 'Дневной сон'}
                    </div>
                    <div className="listItemSub">
                      {formatTime(s.start)} — {s.end ? formatTime(end) : '…'} ·{' '}
                      {formatDuration(s.dur)}
                      {s.tags?.length ? ` · ${s.tags.join(', ')}` : ''}
                    </div>
                  </div>
                  <div className="pill">Редакт.</div>
                </div>
              );
            })}
          </div>

          <button
            className="button buttonFull"
            onClick={() => {
              // create a blank draft by opening editor with a fake session
              const start = Date.now();
              setEditing({
                id: 'new',
                childId: child.id,
                kind: inferSleepKindByTime(start),
                start,
                end: start + 45 * 60 * 1000,
                createdAt: start,
                updatedAt: start,
                tags: [],
              });
            }}
          >
            ＋ Добавить сон вручную
          </button>
        </div>

        <div className="card">
          {wakeWindows.length > 0 ? (
            <>
            <div className="heroRow" style={{ marginBottom: 6 }}>
              <div className="heroArt" aria-hidden>
                <AwakeBabyArt />
              </div>
              <div>
                <div style={{ fontWeight: 900 }}>Окна бодрствования</div>
                <div className="small">Интервалы между снами (ВБ)</div>
              </div>
            </div>
            <div className="wakeWindowsList">
              {wakeWindows.slice(0, 5).map((w, idx) => (
                <div className="wakeWindowsRow" key={idx}>
                  <div className="wakeWindowsTime">
                    {formatTime(w.from)} — {formatTime(w.to)}
                  </div>
                  <div className="wakeWindowsDur">{formatDuration(w.dur)}</div>
                </div>
              ))}
            </div>
            </>
          ) : (
            <div className="heroRow">
              <div className="heroArt" aria-hidden>
                <AwakeBabyArt />
              </div>
              <div>
                <div style={{ fontWeight: 900 }}>Окна бодрствования появятся здесь</div>
                <div className="small">
                  Они считаются автоматически между двумя снами. Добавьте минимум 2 сна.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <EditSleepModal
          session={editing}
          onClose={async () => {
            setEditing(null);
            await refresh();
          }}
          onSaved={async () => {
            setEditing(null);
            await refresh();
            show('Сохранено');
          }}
          onDeleted={async () => {
            setEditing(null);
            await refresh();
            show('Удалено');
          }}
        />
      ) : null}

      {Toast}
    </>
  );
}

function toLocalInputValue(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInputValue(v: string): number {
  return new Date(v).getTime();
}

function EditSleepModal({
  session,
  onClose,
  onSaved,
  onDeleted,
}: {
  session: SleepSession;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const isNew = session.id === 'new';
  const [kind, setKind] = useState<SleepKind>(session.kind);
  const [start, setStart] = useState(toLocalInputValue(session.start));
  const [end, setEnd] = useState(toLocalInputValue((session.end ?? Date.now()) as number));
  const [note, setNote] = useState(session.note ?? '');
  const [tags, setTags] = useState<string[]>(session.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [autoStatus, setAutoStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const startMs = fromLocalInputValue(start);
  const endMs = fromLocalInputValue(end);

  // Autosave for existing sessions (no modal confirmations).
  useEffect(() => {
    if (isNew) return;
    setError(null);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return;
    if (endMs <= startMs) {
      setError('Конец должен быть позже начала');
      return;
    }

    const t = setTimeout(async () => {
      setAutoStatus('saving');
      try {
        await updateSleepSession(session.id, {
          kind,
          start: startMs,
          end: endMs,
          note: note.trim() || undefined,
          tags,
        });
        setAutoStatus('saved');
      } catch (e: any) {
        const code = e?.code;
        if (code === 'SLEEP_OVERLAP')
          setError('Пересекается с другой записью сна. Подвиньте время.');
        else if (code === 'SLEEP_END_BEFORE_START') setError('Конец должен быть позже начала');
        else setError('Не удалось сохранить. Проверьте время.');
        setAutoStatus('error');
      }
    }, 450);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, start, end, note, tags]);

  return (
    <div role="dialog" aria-modal="true" className="modalOverlay" onClick={onClose}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {isNew ? 'Добавить сон' : 'Редактировать сон'}
          </div>
          <button
            className="iconBtnSmall"
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="stack">
          <div className="field">
            <div className="label">Тип сна</div>
            <select
              className="select"
              value={kind}
              onChange={(e) => setKind(e.target.value as SleepKind)}
            >
              <option value="nap">Дневной сон</option>
              <option value="night">Ночной сон</option>
            </select>
          </div>

          <div className="field">
            <div className="label">Теги</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {TAGS.map((t) => {
                const active = tags.includes(t);
                return (
                  <button
                    key={t}
                    className={`pill ${active ? 'pillActive' : ''}`}
                    type="button"
                    onClick={() =>
                      setTags((prev) =>
                        prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                      )
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <div className="label">Начало</div>
            <input
              className="input"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>

          <div className="field">
            <div className="label">Конец</div>
            <input
              className="input"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          <div className="field">
            <div className="label">Заметка</div>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например, уснул на руках"
            />
          </div>

          {error ? (
            <div className="small" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
          ) : null}

          {!isNew ? (
            <div
              className="small"
              style={{ color: autoStatus === 'error' ? 'var(--danger)' : 'rgba(248,250,252,0.75)' }}
            >
              {autoStatus === 'saving'
                ? 'Сохраняю…'
                : autoStatus === 'saved'
                  ? 'Сохранено'
                  : autoStatus === 'error'
                    ? 'Есть ошибка — исправьте поля выше'
                    : 'Автосохранение включено'}
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button className="button" onClick={onClose}>
              {isNew ? 'Отмена' : 'Готово'}
            </button>
            {isNew ? (
              <button
                className="button buttonPrimary"
                disabled={saving}
                onClick={async () => {
                  setError(null);
                  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
                    setError('Проверьте дату/время');
                    return;
                  }
                  if (endMs <= startMs) {
                    setError('Конец должен быть позже начала');
                    return;
                  }
                  setSaving(true);
                  try {
                    await createSleepSessionManual({
                      childId: session.childId,
                      kind,
                      start: startMs,
                      end: endMs,
                      note,
                      tags,
                    });
                    await onSaved();
                  } catch (e: any) {
                    const code = e?.code;
                    if (code === 'SLEEP_OVERLAP')
                      setError('Пересекается с другой записью сна. Подвиньте время.');
                    else if (code === 'SLEEP_END_BEFORE_START')
                      setError('Конец должен быть позже начала');
                    else setError('Не удалось сохранить. Проверьте время.');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? 'Сохраняю…' : 'Добавить'}
              </button>
            ) : (
              <span className="pill" style={{ opacity: 0.85 }}>
                Auto-save
              </span>
            )}
          </div>

          {!isNew ? (
            <button
              className="button buttonDanger buttonFull"
              disabled={saving}
              onClick={async () => {
                await deleteSleepSession(session.id);
                await onDeleted();
              }}
            >
              Удалить
            </button>
          ) : null}

          <div className="small">
            Пересекающиеся интервалы сна запрещены — если есть конфликт, приложение подскажет.
          </div>
        </div>
      </div>
    </div>
  );
}
