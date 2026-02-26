import { ensureAppState, db } from '@/lib/db';
import type { AppState } from '@/lib/types';

export type Session = NonNullable<AppState['session']>;

export async function getAuthMode(): Promise<'local' | 'cloud'> {
  const st = await ensureAppState();
  return st.authMode ?? 'local';
}

export async function setAuthMode(mode: 'local' | 'cloud'): Promise<void> {
  const st = await ensureAppState();
  await db.appState.put({ ...st, authMode: mode });
}

export async function getSession(): Promise<Session | undefined> {
  const st = await ensureAppState();
  return st.session;
}

export async function setSession(session: Session): Promise<void> {
  const st = await ensureAppState();
  await db.appState.put({ ...st, session });
}

export async function signOut(): Promise<void> {
  const st = await ensureAppState();
  await db.appState.put({ ...st, session: undefined, authMode: 'local' });
}
