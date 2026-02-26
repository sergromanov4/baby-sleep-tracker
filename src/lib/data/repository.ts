import type { Child, GrowthEntry, Sex, SleepKind, SleepSession } from '@/lib/types';

/**
 * Repository interface for account-ready architecture.
 * Today we implement LocalRepository (IndexedDB).
 * Later we can add CloudRepository (API + sync) without changing UI code.
 */
export interface Repository {
  // children
  listChildren(): Promise<Child[]>;
  createChild(input: { name: string; dob: string; sex: Sex }): Promise<Child>;
  setActiveChild(childId: string): Promise<void>;
  getActiveChild(): Promise<Child | undefined>;

  // sleep
  startSleepSession(params: {
    childId: string;
    kind: SleepKind;
    start?: number;
  }): Promise<SleepSession>;
  stopSleepSession(params: { sessionId: string; end?: number }): Promise<void>;
  getRunningSleepSession(childId: string): Promise<SleepSession | undefined>;
  listSleepSessionsInRange(
    childId: string,
    startMs: number,
    endMs: number,
  ): Promise<SleepSession[]>;
  updateSleepSession(
    sessionId: string,
    patch: Partial<Pick<SleepSession, 'start' | 'end' | 'kind' | 'note' | 'tags'>>,
  ): Promise<void>;
  createSleepSessionManual(params: {
    childId: string;
    kind: SleepKind;
    start: number;
    end: number;
    note?: string;
    tags?: string[];
  }): Promise<SleepSession>;
  deleteSleepSession(sessionId: string): Promise<void>;

  // growth
  addGrowthEntry(params: {
    childId: string;
    date: string;
    weightKg?: number;
    heightCm?: number;
    headCm?: number;
    note?: string;
  }): Promise<GrowthEntry>;
  listGrowthEntries(childId: string): Promise<GrowthEntry[]>;
  deleteGrowthEntry(id: string): Promise<void>;
}
