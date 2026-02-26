import type { SleepSession } from '@/lib/types';
import { formatDuration, formatTime, toYmd } from '@/lib/time';

export type DailyInsight = {
  id: string;
  title: string;
  text: string;
};

function ymd(ms: number) {
  return toYmd(new Date(ms));
}

/**
 * Lightweight "1 insight per day" generator.
 * Keeps it supportive and non-judgemental.
 */
export function generateDailyInsight(params: {
  childName: string;
  sessions: SleepSession[];
  nowMs: number;
  wwLowMs: number;
  wwHighMs: number;
  wwSamples: number;
}): DailyInsight {
  const { childName, sessions, nowMs, wwLowMs, wwHighMs, wwSamples } = params;
  const t24Start = nowMs - 24 * 60 * 60 * 1000;

  const last24 = sessions
    .map((s) => {
      const end = s.end ?? nowMs;
      const a = Math.max(s.start, t24Start);
      const b = Math.min(end, nowMs);
      return { s, dur: Math.max(0, b - a) };
    })
    .filter((x) => x.dur > 0);

  if (last24.length > 0) {
    const best = [...last24].sort((a, b) => b.dur - a.dur)[0]!;
    const started = formatTime(best.s.start);
    return {
      id: `longest24-${ymd(nowMs)}`,
      title: 'Инсайт дня',
      text: `Самый длинный сон за последние 24 часа начался в ${started} и длился ${formatDuration(best.dur)}.`,
    };
  }

  if (wwSamples >= 3) {
    return {
      id: `wake-window-${ymd(nowMs)}`,
      title: 'Инсайт дня',
      text: `Обычно ${childName} засыпает в «окне» ВБ ${formatDuration(wwLowMs)}—${formatDuration(wwHighMs)} (по последним 7 дням).`,
    };
  }

  return {
    id: `welcome-${ymd(nowMs)}`,
    title: 'Инсайт дня',
    text: 'Добавьте ещё пару записей сна — и я начну подсвечивать паттерны и удобные окна бодрствования.',
  };
}
