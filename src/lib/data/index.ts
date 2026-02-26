import type { Repository } from './repository';
import { LocalRepository } from './localRepository';
import { getAuthMode, getSession } from '@/lib/auth/session';

/**
 * Repository selector.
 * For now we always return LocalRepository.
 * Later: if authMode === 'cloud' and there is a session, return CloudRepository.
 */
export async function getRepository(): Promise<Repository> {
  const mode = await getAuthMode();
  if (mode === 'cloud') {
    const session = await getSession();
    if (session) {
      // TODO: return CloudRepository(session)
      return LocalRepository;
    }
  }
  return LocalRepository;
}
