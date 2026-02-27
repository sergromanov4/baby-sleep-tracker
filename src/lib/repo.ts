import { nanoid } from 'nanoid';
import { db, ensureAppState } from './db';
import type { AppState, Child, GrowthEntry, Sex, SleepKind, SleepSession } from './types';
import { SleepDomainError, validateEndAfterStart, validateNoOverlap } from './sleepRules';

export function inferSleepKindByTime(ms: number): SleepKind {
  const d = new Date(ms);
  const h = d.getHours();
  // Simple heuristic for MVP: night is 19:00–07:00
  return h >= 19 || h < 7 ? 'night' : 'nap';
}

export async function listChildren(): Promise<Child[]> {
  return db.children.orderBy('createdAt').toArray();
}

export async function createChild(input: { name: string; dob: string; sex: Sex }): Promise<Child> {
  const child: Child = {
    id: nanoid(),
    name: input.name.trim() || 'Ребенок',
    dob: input.dob,
    sex: input.sex,
    createdAt: Date.now(),
  };
  await db.children.add(child);

  const state = await ensureAppState();
  if (!state.activeChildId) {
    await db.appState.put({ ...state, activeChildId: child.id });
  }
  return child;
}

export async function getAppState(): Promise<AppState> {
  return ensureAppState();
}

export async function setActiveChild(childId: string): Promise<void> {
  const state = await ensureAppState();
  await db.appState.put({ ...state, activeChildId: childId });
}

export async function updateAppState(patch: Partial<AppState>): Promise<AppState> {
  const state = await ensureAppState();
  const next = { ...state, ...patch };
  await db.appState.put(next);
  return next;
}

export async function getInsightDismissedYmd(): Promise<string | undefined> {
  const state = await ensureAppState();
  return state.insightDismissedYmd;
}

export async function dismissInsightForToday(ymd: string): Promise<void> {
  const state = await ensureAppState();
  await db.appState.put({ ...state, insightDismissedYmd: ymd });
}

export async function getActiveChild(): Promise<Child | undefined> {
  const state = await ensureAppState();
  if (!state.activeChildId) return undefined;
  return db.children.get(state.activeChildId);
}

export async function startSleepSession(params: {
  childId: string;
  kind: SleepKind;
  start?: number;
}): Promise<SleepSession> {
  const now = params.start ?? Date.now();

  const running = await getRunningSleepSession(params.childId);
  if (running) {
    throw new SleepDomainError('SLEEP_ACTIVE_EXISTS', 'Active sleep session already exists', {
      activeId: running.id,
      activeStart: running.start,
    });
  }

  const existing = await db.sleepSessions.where({ childId: params.childId }).toArray();
  // For active session we validate overlap against "now" as effective end.
  validateNoOverlap({ candidate: { start: now, end: null }, existing, now: Date.now() });

  const session: SleepSession = {
    id: nanoid(),
    childId: params.childId,
    kind: params.kind,
    start: now,
    end: null,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.sleepSessions.add(session);
  return session;
}

export async function stopSleepSession(params: { sessionId: string; end?: number }): Promise<void> {
  const end = params.end ?? Date.now();
  const s = await db.sleepSessions.get(params.sessionId);
  if (!s) return;
  if (s.end !== null) return;
  validateEndAfterStart(s.start, end);

  const existing = await db.sleepSessions.where({ childId: s.childId }).toArray();
  validateNoOverlap({ candidate: { id: s.id, start: s.start, end }, existing, now: Date.now() });

  await db.sleepSessions.update(params.sessionId, { end, updatedAt: Date.now() });
}

export async function getRunningSleepSession(childId: string): Promise<SleepSession | undefined> {
  const list = await db.sleepSessions
    .where({ childId })
    .filter((s) => s.end === null)
    .toArray();
  return list[0];
}

export async function listSleepSessionsInRange(
  childId: string,
  startMs: number,
  endMs: number,
): Promise<SleepSession[]> {
  const now = Date.now();
  return db.sleepSessions
    .where({ childId })
    .filter((s) => {
      const sEnd = s.end ?? now;
      return s.start < endMs && sEnd > startMs;
    })
    .sortBy('start');
}

export async function updateSleepSession(
  sessionId: string,
  patch: Partial<Pick<SleepSession, 'start' | 'end' | 'kind' | 'note' | 'tags'>>,
): Promise<void> {
  const s = await db.sleepSessions.get(sessionId);
  if (!s) return;

  const nextStart = patch.start ?? s.start;
  const nextEnd = patch.end ?? s.end;

  // If making it active, ensure no other active exists
  if (nextEnd === null) {
    const running = await getRunningSleepSession(s.childId);
    if (running && running.id !== s.id) {
      throw new SleepDomainError(
        'SLEEP_ACTIVE_EXISTS',
        'Another active sleep session already exists',
        {
          activeId: running.id,
        },
      );
    }
  }

  if (typeof nextEnd === 'number') {
    validateEndAfterStart(nextStart, nextEnd);
  }

  const existing = await db.sleepSessions.where({ childId: s.childId }).toArray();
  validateNoOverlap({
    candidate: { id: s.id, start: nextStart, end: nextEnd ?? null },
    existing,
    now: Date.now(),
  });

  await db.sleepSessions.update(sessionId, { ...patch, updatedAt: Date.now() });
}

export async function createSleepSessionManual(params: {
  childId: string;
  kind: SleepKind;
  start: number;
  end: number;
  note?: string;
  tags?: string[];
}): Promise<SleepSession> {
  validateEndAfterStart(params.start, params.end);
  const existing = await db.sleepSessions.where({ childId: params.childId }).toArray();
  validateNoOverlap({
    candidate: { start: params.start, end: params.end },
    existing,
    now: Date.now(),
  });

  const session: SleepSession = {
    id: nanoid(),
    childId: params.childId,
    kind: params.kind,
    start: params.start,
    end: params.end,
    note: params.note?.trim() || undefined,
    tags: params.tags ?? [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.sleepSessions.add(session);
  return session;
}

export async function deleteSleepSession(sessionId: string): Promise<void> {
  await db.sleepSessions.delete(sessionId);
}

export async function setDayRangeMode(mode: 'today' | 'last24'): Promise<void> {
  const state = await ensureAppState();
  await db.appState.put({ ...state, dayRangeMode: mode });
}

export async function getDayRangeMode(): Promise<'today' | 'last24'> {
  const state = await ensureAppState();
  // Default UX: parents usually think in the last 24 hours, not calendar days.
  return state.dayRangeMode ?? 'last24';
}

export async function computeWakeWindowStats(
  childId: string,
  days = 7,
): Promise<{ avgWakeMs: number; lastWakeMs: number | null }> {
  const model = await computeWakeWindowModel(childId, days);
  return { avgWakeMs: model.avgWakeMs, lastWakeMs: model.lastWakeMs };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

/**
 * Smart wake-window model used for the "ВБ" indicator.
 * Returns an "optimal" range based on recent wake windows.
 */
export async function computeWakeWindowModel(
  childId: string,
  days = 7,
): Promise<{
  avgWakeMs: number;
  p25: number;
  p75: number;
  low: number;
  high: number;
  lastWakeMs: number | null;
  sampleSize: number;
  daysWithData: number;
}> {
  const end = Date.now();
  const start = end - days * 24 * 60 * 60 * 1000;
  const list = await listSleepSessionsInRange(childId, start, end);
  const now = Date.now();
  const sorted = [...list].sort((a, b) => a.start - b.start);

  const windows: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    const aEnd = a.end ?? now;
    if (aEnd < b.start) windows.push(b.start - aEnd);
  }

  const wSorted = [...windows].sort((a, b) => a - b);
  const avgWakeMs = wSorted.length ? wSorted.reduce((x, y) => x + y, 0) / wSorted.length : 0;
  const p25 = percentile(wSorted, 0.25);
  const p75 = percentile(wSorted, 0.75);

  // Fall back to a sensible corridor if data is sparse.
  const fallback = 90 * 60 * 1000;
  const base = avgWakeMs > 0 ? avgWakeMs : fallback;

  // Prefer IQR-based range when enough samples, else +-15% around avg.
  const hasIqr = wSorted.length >= 6 && p25 > 0 && p75 > p25;
  const rawLow = hasIqr ? p25 : base * 0.85;
  const rawHigh = hasIqr ? p75 : base * 1.15;

  // Clamp to avoid extreme UI ranges.
  const clamp = (v: number) => Math.min(4 * 60 * 60 * 1000, Math.max(35 * 60 * 1000, v));
  const low = clamp(rawLow);
  const high = clamp(Math.max(rawHigh, low + 10 * 60 * 1000));

  // last wake: from the end of last finished sleep
  const lastFinished = [...sorted]
    .reverse()
    .find((s): s is SleepSession & { end: number } => typeof s.end === 'number');
  const lastWakeMs = lastFinished ? Math.max(0, now - lastFinished.end) : null;

  const dayKeys = new Set<string>();
  for (const session of sorted) {
    const sessionStart = Math.max(start, session.start);
    const sessionEnd = Math.min(end, session.end ?? now);
    if (sessionEnd <= sessionStart) continue;

    let cursor = new Date(sessionStart);
    cursor.setHours(0, 0, 0, 0);
    const endDate = new Date(sessionEnd);
    endDate.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= endDate.getTime()) {
      dayKeys.add(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
      );
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return {
    avgWakeMs: base,
    p25,
    p75,
    low,
    high,
    lastWakeMs,
    sampleSize: wSorted.length,
    daysWithData: dayKeys.size,
  };
}

export async function addGrowthEntry(params: {
  childId: string;
  date: string;
  weightKg?: number;
  heightCm?: number;
  headCm?: number;
  note?: string;
}): Promise<GrowthEntry> {
  const entry: GrowthEntry = {
    id: nanoid(),
    childId: params.childId,
    date: params.date,
    weightKg: params.weightKg,
    heightCm: params.heightCm,
    headCm: params.headCm,
    note: params.note,
    createdAt: Date.now(),
  };
  await db.growthEntries.add(entry);
  return entry;
}

export async function listGrowthEntries(childId: string): Promise<GrowthEntry[]> {
  return db.growthEntries.where({ childId }).sortBy('date');
}

export async function deleteGrowthEntry(id: string): Promise<void> {
  await db.growthEntries.delete(id);
}
