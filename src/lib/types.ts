export type Sex = 'female' | 'male';
export type SleepKind = 'nap' | 'night';
export type AppLanguage = 'ru' | 'en' | 'fr' | 'de' | 'es' | 'zh';

export type Child = {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  sex: Sex;
  createdAt: number;
};

export type SleepSession = {
  id: string;
  childId: string;
  kind: SleepKind;
  start: number; // ms
  end: number | null; // ms
  note?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
};

export type GrowthEntry = {
  id: string;
  childId: string;
  date: string; // YYYY-MM-DD
  weightKg?: number;
  heightCm?: number;
  headCm?: number;
  note?: string;
  createdAt: number;
};

export type AppState = {
  id: 'singleton';
  activeChildId?: string;
  theme: 'light';
  language?: AppLanguage;
  wakeWindowMin?: number; // default
  dayRangeMode?: 'today' | 'last24';

  /**
   * Account-ready architecture:
   * - local: data only in browser (current MVP)
   * - cloud: later we can sync via API when auth is implemented
   */
  authMode?: 'local' | 'cloud';
  session?: {
    userId: string;
    email?: string;
    accessToken: string;
    createdAt: number;
  };

  /** Daily insight UI */
  insightDismissedYmd?: string; // YYYY-MM-DD
};
