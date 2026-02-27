import Dexie, { type Table } from 'dexie';
import type { AppState, Child, GrowthEntry, SleepSession } from './types';

type SleepSessionMigrationRecord = SleepSession & { tags?: string[] };
type AppStateMigrationRecord = Partial<AppState> & Record<string, unknown>;

export class AppDB extends Dexie {
  children!: Table<Child, string>;
  sleepSessions!: Table<SleepSession, string>;
  growthEntries!: Table<GrowthEntry, string>;
  appState!: Table<AppState, 'singleton'>;

  constructor() {
    super('baby_sleep_tracker');

    this.version(1).stores({
      children: 'id, createdAt',
      sleepSessions: 'id, childId, start, end, kind, updatedAt',
      growthEntries: 'id, childId, date, createdAt',
      appState: 'id',
    });

    // v2: add tags on sleep sessions and UI preferences/undo in app state
    this.version(2)
      .stores({
        children: 'id, createdAt',
        sleepSessions: 'id, childId, start, end, kind, updatedAt',
        growthEntries: 'id, childId, date, createdAt',
        appState: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('sleepSessions')
          .toCollection()
          .modify((s: SleepSessionMigrationRecord) => {
            if (!Array.isArray(s.tags)) s.tags = [];
          });
        await tx
          .table('appState')
          .toCollection()
          .modify((st: AppStateMigrationRecord) => {
            // Prefer the "last 24 hours" mental model by default.
            if (!st.dayRangeMode) st.dayRangeMode = 'last24';
            if (!('lastUndo' in st)) st.lastUndo = undefined;
          });
      });

    // v3: account-ready fields in app state
    this.version(3)
      .stores({
        children: 'id, createdAt',
        sleepSessions: 'id, childId, start, end, kind, updatedAt',
        growthEntries: 'id, childId, date, createdAt',
        appState: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('appState')
          .toCollection()
          .modify((st: AppStateMigrationRecord) => {
            if (!st.authMode) st.authMode = 'local';
            if (!('session' in st)) st.session = undefined;
          });
      });

    // v4: daily insight dismissal
    this.version(4)
      .stores({
        children: 'id, createdAt',
        sleepSessions: 'id, childId, start, end, kind, updatedAt',
        growthEntries: 'id, childId, date, createdAt',
        appState: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('appState')
          .toCollection()
          .modify((st: AppStateMigrationRecord) => {
            if (!('insightDismissedYmd' in st)) st.insightDismissedYmd = undefined;
          });
      });
  }
}

export const db = new AppDB();

export async function ensureAppState(): Promise<AppState> {
  const existing = await db.appState.get('singleton');
  if (existing) return existing;
  const state: AppState = {
    id: 'singleton',
    tipsEnabled: true,
    theme: 'light',
    wakeWindowMin: 90,
    // Default to the last 24 hours view.
    dayRangeMode: 'last24',
    authMode: 'local',
    session: undefined,
    insightDismissedYmd: undefined,
  };
  await db.appState.put(state);
  return state;
}
