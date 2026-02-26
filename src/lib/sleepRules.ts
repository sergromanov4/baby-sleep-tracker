import type { SleepSession } from './types';

export type SleepErrorCode = 'SLEEP_ACTIVE_EXISTS' | 'SLEEP_END_BEFORE_START' | 'SLEEP_OVERLAP';

export class SleepDomainError extends Error {
  code: SleepErrorCode;
  details?: any;
  constructor(code: SleepErrorCode, message: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Treat intervals as [start, end) (end exclusive)
export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

export function validateEndAfterStart(start: number, end: number) {
  if (end <= start) {
    throw new SleepDomainError('SLEEP_END_BEFORE_START', 'End time must be after start time', {
      start,
      end,
    });
  }
}

export function validateNoOverlap(params: {
  candidate: { id?: string; start: number; end: number | null };
  existing: SleepSession[];
  now: number;
}) {
  const { candidate, existing, now } = params;
  const candEnd = candidate.end ?? now;

  for (const s of existing) {
    if (candidate.id && s.id === candidate.id) continue;
    const sEnd = s.end ?? now;
    if (intervalsOverlap(candidate.start, candEnd, s.start, sEnd)) {
      throw new SleepDomainError(
        'SLEEP_OVERLAP',
        'Sleep session overlaps with an existing session',
        {
          conflictId: s.id,
          conflictStart: s.start,
          conflictEnd: s.end,
        },
      );
    }
  }
}
