'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ActiveChildGate from '@/components/gates/ActiveChildGate';
import { AwakeBabyArt } from '@/components/illustrations/Illustrations';
import WakeWindowIndicator from '@/components/indicators/WakeWindowIndicator';
import {
  computeWakeWindowModel,
  createSleepSessionManual,
  deleteSleepSession,
  getDayRangeMode,
  inferSleepKindByTime,
  listSleepSessionsInRange,
  setDayRangeMode,
  updateSleepSession,
} from '@/lib/repo';
import { getSleepErrorCode } from '@/lib/sleepRules';
import type { Child, SleepKind, SleepSession } from '@/lib/types';
import { endOfDayMs, formatTime, startOfDayMs, toYmd } from '@/lib/time';
import { useToast } from '@/components/feedback/useToast';
import AppSelect from '@/components/forms/AppSelect';
import { useI18n, type I18nKey } from '@/lib/i18n';

type SleepTagDef = {
  id: string;
  labelKey: I18nKey;
  legacyLabels: string[];
};

const SLEEP_TAGS: ReadonlyArray<SleepTagDef> = [
  { id: 'onArms', labelKey: 'day.tag.onArms', legacyLabels: ['На руках', 'In arms'] },
  { id: 'stroller', labelKey: 'day.tag.stroller', legacyLabels: ['В коляске', 'In stroller'] },
  { id: 'car', labelKey: 'day.tag.car', legacyLabels: ['В машине', 'In car'] },
  { id: 'pacifier', labelKey: 'day.tag.pacifier', legacyLabels: ['Соска', 'Pacifier'] },
  { id: 'feeding', labelKey: 'day.tag.feeding', legacyLabels: ['Кормление', 'Feeding'] },
  { id: 'crying', labelKey: 'day.tag.crying', legacyLabels: ['Плачет', 'Crying'] },
  { id: 'noise', labelKey: 'day.tag.noise', legacyLabels: ['Шум', 'Noise'] },
  { id: 'dark', labelKey: 'day.tag.dark', legacyLabels: ['Темно', 'Dark'] },
  { id: 'light', labelKey: 'day.tag.light', legacyLabels: ['Светло', 'Light'] },
];

function normalizeSleepTag(tag: string): string {
  const value = tag.trim();
  const match = SLEEP_TAGS.find(
    (entry) => entry.id === value || entry.legacyLabels.includes(value),
  );
  return match?.id ?? value;
}

function normalizeSleepTags(tags: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const value = normalizeSleepTag(tag);
    if (seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

function formatSleepTagLabel(tag: string, translate: (key: I18nKey) => string): string {
  const normalized = normalizeSleepTag(tag);
  const match = SLEEP_TAGS.find((entry) => entry.id === normalized);
  return match ? translate(match.labelKey) : tag;
}

export default function DayPage() {
  return <ActiveChildGate>{(child) => <DayScreen child={child} />}</ActiveChildGate>;
}

function DayScreen({ child }: { child: Child }) {
  const minDaysForSmartScale = 3;
  const router = useRouter();
  const search = useSearchParams();
  const [dateYmd, setDateYmd] = useState(() => toYmd(new Date()));
  const [rangeMode, setRangeMode] = useState<'today' | 'last24'>('today');
  const [items, setItems] = useState<SleepSession[]>([]);
  const [editing, setEditing] = useState<SleepSession | null>(null);
  const [wwLow, setWwLow] = useState<number>(90 * 60 * 1000);
  const [wwHigh, setWwHigh] = useState<number>(110 * 60 * 1000);
  const [wwSamples, setWwSamples] = useState<number>(0);
  const [wwDaysWithData, setWwDaysWithData] = useState<number>(0);
  const { show, Toast } = useToast();
  const { t, formatDurationValue } = useI18n();

  const openManualEditor = useCallback(() => {
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
  }, [child.id]);

  useEffect(() => {
    (async () => {
      const mode = await getDayRangeMode();
      setRangeMode(mode);
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

  const refresh = useCallback(async () => {
    const list = await listSleepSessionsInRange(child.id, dayStart, dayEnd);
    setItems(list);

    const ww = await computeWakeWindowModel(child.id, 7);
    setWwLow(ww.low);
    setWwHigh(ww.high);
    setWwSamples(ww.sampleSize);
    setWwDaysWithData(ww.daysWithData);
  }, [child.id, dayStart, dayEnd]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const addSleep = search?.get('addSleep');
    if (addSleep !== '1') return;
    openManualEditor();
    router.replace('/day');
  }, [search, openManualEditor, router]);

  const rows = useMemo(() => {
    return items.map((session) => {
      const end = session.end ?? Date.now();
      const startClamped = Math.max(session.start, dayStart);
      const endClamped = Math.min(end, dayEnd);
      return {
        ...session,
        startClamped,
        endClamped,
        dur: Math.max(0, endClamped - startClamped),
      };
    });
  }, [items, dayStart, dayEnd]);

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.start - b.start), [items]);

  const wakeWindows = useMemo(() => {
    const windows: Array<{ from: number; to: number; dur: number }> = [];
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const a = sortedItems[i]!;
      const b = sortedItems[i + 1]!;
      const aEnd = a.end ?? Date.now();
      if (aEnd < b.start) {
        windows.push({ from: aEnd, to: b.start, dur: b.start - aEnd });
      }
    }
    return windows;
  }, [sortedItems]);

  const summary = useMemo(() => {
    const now = Date.now();
    let total = 0;
    let nap = 0;
    let night = 0;

    for (const session of rows) {
      const end = session.end ?? now;
      const dur = Math.max(0, Math.min(end, dayEnd) - Math.max(session.start, dayStart));
      total += dur;
      if (session.kind === 'night') night += dur;
      else nap += dur;
    }

    const last = sortedItems.at(-1);
    const lastEnd = last?.end ?? null;
    const sinceWake = lastEnd ? Math.max(0, now - lastEnd) : null;

    return { total, nap, night, sinceWake };
  }, [rows, sortedItems, dayStart, dayEnd]);

  const hasSmartWakeScale = wwDaysWithData >= minDaysForSmartScale;

  return (
    <>
      <div className="stack">
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800 }}>
                {rangeMode === 'last24' ? t('day.rangeLast24Title') : t('day.rangeDayTitle')}
              </div>
              <div className="small">{child.name}</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <AppSelect
                value={rangeMode}
                onChange={async (nextRangeMode) => {
                  setRangeMode(nextRangeMode);
                  await setDayRangeMode(nextRangeMode);
                }}
                options={[
                  { value: 'today', label: t('day.rangeByDays') },
                  { value: 'last24', label: t('day.rangeLast24') },
                ]}
                style={{ maxWidth: 170 }}
              />
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
            <div className="pill">
              {t('day.pillSleep')}: {formatDurationValue(summary.total)}
            </div>
            <div className="pill">
              {t('day.pillNap')}: {formatDurationValue(summary.nap)}
            </div>
            <div className="pill">
              {t('day.pillNight')}: {formatDurationValue(summary.night)}
            </div>
          </div>

          {summary.sinceWake !== null ? (
            <div className="small">
              {t('day.currentWake', { duration: formatDurationValue(summary.sinceWake) })}
            </div>
          ) : null}

          {summary.sinceWake !== null && hasSmartWakeScale ? (
            <div style={{ marginTop: 10 }}>
              <WakeWindowIndicator
                sinceWakeMs={summary.sinceWake}
                lowMs={wwLow}
                highMs={wwHigh}
                sampleSize={wwSamples}
              />
            </div>
          ) : summary.sinceWake !== null ? (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              <div className="small" style={{ opacity: 0.95 }}>
                {t('day.scaleAfter3Days')}
              </div>
              <div className="small" style={{ marginTop: 6, opacity: 0.9 }}>
                {t('day.scaleFilled', { filled: wwDaysWithData, total: minDaysForSmartScale })}
              </div>
            </div>
          ) : null}

          <div className="list">
            {rows.length === 0 ? (
              <div className="empty">
                <div className="emptyTitle">{t('day.emptyTitle')}</div>
                <div className="emptyText">{t('day.emptyText')}</div>
              </div>
            ) : null}

            {rows.map((session) => {
              const end = session.end ?? Date.now();
              return (
                <div
                  key={session.id}
                  className="listItem"
                  onClick={() => setEditing(session)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div className="listItemTitle">
                      {session.kind === 'night' ? t('day.rowNight') : t('day.rowNap')}
                    </div>
                    <div className="listItemSub">
                      {formatTime(session.start)} — {session.end ? formatTime(end) : '…'} ·{' '}
                      {formatDurationValue(session.dur)}
                      {session.tags?.length
                        ? ` · ${session.tags.map((tag) => formatSleepTagLabel(tag, t)).join(', ')}`
                        : ''}
                    </div>
                  </div>
                  <div className="pill">{t('day.edit')}</div>
                </div>
              );
            })}
          </div>

          <button className="button buttonFull" onClick={openManualEditor}>
            {t('day.addManual')}
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
                  <div style={{ fontWeight: 900 }}>{t('day.wakeWindows')}</div>
                  <div className="small">{t('day.wakeWindowsSub')}</div>
                </div>
              </div>
              <div className="wakeWindowsList">
                {wakeWindows.slice(0, 5).map((windowData, idx) => (
                  <div className="wakeWindowsRow" key={idx}>
                    <div className="wakeWindowsTime">
                      {formatTime(windowData.from)} — {formatTime(windowData.to)}
                    </div>
                    <div className="wakeWindowsDur">{formatDurationValue(windowData.dur)}</div>
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
                <div style={{ fontWeight: 900 }}>{t('day.wakeWindowsEmptyTitle')}</div>
                <div className="small">{t('day.wakeWindowsEmptyText')}</div>
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
            show(t('day.toastSaved'));
          }}
          onDeleted={async () => {
            setEditing(null);
            await refresh();
            show(t('day.toastDeleted'));
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
  const [end, setEnd] = useState(toLocalInputValue(session.end ?? Date.now()));
  const [note, setNote] = useState(session.note ?? '');
  const [tags, setTags] = useState<string[]>(() => normalizeSleepTags(session.tags ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const startMs = fromLocalInputValue(start);
  const endMs = fromLocalInputValue(end);

  const saveSession = async () => {
    setError(null);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      setError(t('day.modalErrorDateTime'));
      return;
    }
    if (endMs <= startMs) {
      setError(t('day.modalErrorEndBeforeStart'));
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await createSleepSessionManual({
          childId: session.childId,
          kind,
          start: startMs,
          end: endMs,
          note,
          tags,
        });
      } else {
        await updateSleepSession(session.id, {
          kind,
          start: startMs,
          end: endMs,
          note: note.trim() || undefined,
          tags,
        });
      }
      await onSaved();
    } catch (error: unknown) {
      const code = getSleepErrorCode(error);
      if (code === 'SLEEP_OVERLAP') setError(t('day.modalErrorOverlap'));
      else if (code === 'SLEEP_END_BEFORE_START') setError(t('day.modalErrorEndBeforeStart'));
      else setError(t('day.modalErrorSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="modalOverlay" onClick={onClose}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {isNew ? t('day.modalAddTitle') : t('day.modalEditTitle')}
          </div>
          <button
            className="iconBtnSmall"
            type="button"
            onClick={onClose}
            aria-label={t('day.modalClose')}
            title={t('day.modalClose')}
          >
            ✕
          </button>
        </div>

        <div className="stack">
          <div className="field">
            <div className="label">{t('day.modalType')}</div>
            <AppSelect
              value={kind}
              onChange={(nextKind) => setKind(nextKind)}
              options={[
                { value: 'nap', label: t('sleep.kindNap') },
                { value: 'night', label: t('sleep.kindNight') },
              ]}
            />
          </div>

          <div className="field">
            <div className="label">{t('day.modalTags')}</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {SLEEP_TAGS.map((tagDef) => {
                const active = tags.includes(tagDef.id);
                return (
                  <button
                    key={tagDef.id}
                    className={`pill ${active ? 'pillActive' : ''}`}
                    type="button"
                    onClick={() =>
                      setTags((prev) =>
                        prev.includes(tagDef.id)
                          ? prev.filter((x) => x !== tagDef.id)
                          : [...prev, tagDef.id],
                      )
                    }
                  >
                    {t(tagDef.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <div className="label">{t('day.modalStart')}</div>
            <input
              className="input"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>

          <div className="field">
            <div className="label">{t('day.modalEnd')}</div>
            <input
              className="input"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          <div className="field">
            <div className="label">{t('day.modalNote')}</div>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('day.modalNotePlaceholder')}
            />
          </div>

          {error ? (
            <div className="small" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
          ) : null}

          <button className="button buttonFull" disabled={saving} onClick={onClose}>
            {t('day.modalCancel')}
          </button>

          <button
            className="button buttonPrimary buttonFull"
            disabled={saving}
            onClick={saveSession}
          >
            {saving ? t('day.modalSaving') : t('day.modalSave')}
          </button>

          {!isNew ? (
            <button
              className="button buttonDanger buttonFull"
              disabled={saving}
              onClick={async () => {
                await deleteSleepSession(session.id);
                await onDeleted();
              }}
            >
              {t('day.modalDelete')}
            </button>
          ) : null}

          <div className="small">{t('day.modalHint')}</div>
        </div>
      </div>
    </div>
  );
}
