import type { AppLanguage } from './types';

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fromYmd(ymd: string): Date {
  const [y, m, dd] = ymd.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, dd ?? 1);
}

export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDate(ymd: string, language: AppLanguage = 'ru'): string {
  const d = fromYmd(ymd);
  if (language === 'en') {
    return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
  }
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatDateRu(ymd: string): string {
  return formatDate(ymd, 'ru');
}

export function durationMs(start: number, end: number): number {
  return Math.max(0, end - start);
}

export function formatDuration(ms: number, language: AppLanguage = 'ru'): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (language === 'en') {
    if (h <= 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  if (h <= 0) return `${m} м`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} м`;
}

export function ageInMonths(dobYmd: string, onDate = new Date()): number {
  const dob = fromYmd(dobYmd);
  let months =
    (onDate.getFullYear() - dob.getFullYear()) * 12 + (onDate.getMonth() - dob.getMonth());
  if (onDate.getDate() < dob.getDate()) months -= 1;
  return Math.max(0, months);
}

export function startOfDayMs(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}

export function endOfDayMs(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
}
