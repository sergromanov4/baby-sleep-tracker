import * as XLSX from 'xlsx';
import { db } from './db';
import { formatDuration, formatTime } from './time';

export async function exportAllToExcel(filename = 'baby-tracker-export.xlsx'): Promise<void> {
  const children = await db.children.toArray();
  const sessions = await db.sleepSessions.toArray();
  const growth = await db.growthEntries.toArray();

  const wb = XLSX.utils.book_new();

  const childSheet = XLSX.utils.json_to_sheet(
    children.map((c) => ({
      id: c.id,
      name: c.name,
      dob: c.dob,
      sex: c.sex,
      createdAt: new Date(c.createdAt).toISOString(),
    })),
  );
  XLSX.utils.book_append_sheet(wb, childSheet, 'Children');

  const sleepSheet = XLSX.utils.json_to_sheet(
    sessions
      .sort((a, b) => a.start - b.start)
      .map((s) => {
        const end = s.end ?? null;
        const dur = end ? formatDuration(end - s.start) : '';
        return {
          id: s.id,
          childId: s.childId,
          kind: s.kind,
          startISO: new Date(s.start).toISOString(),
          endISO: end ? new Date(end).toISOString() : '',
          startLocal: `${new Date(s.start).toLocaleDateString()} ${formatTime(s.start)}`,
          endLocal: end ? `${new Date(end).toLocaleDateString()} ${formatTime(end)}` : '',
          duration: dur,
          note: s.note ?? '',
          tags: (s.tags ?? []).join(', '),
        };
      }),
  );
  XLSX.utils.book_append_sheet(wb, sleepSheet, 'Sleep');

  const growthSheet = XLSX.utils.json_to_sheet(
    growth
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((g) => ({
        id: g.id,
        childId: g.childId,
        date: g.date,
        weightKg: g.weightKg ?? '',
        heightCm: g.heightCm ?? '',
        headCm: g.headCm ?? '',
        note: g.note ?? '',
      })),
  );
  XLSX.utils.book_append_sheet(wb, growthSheet, 'Growth');

  XLSX.writeFile(wb, filename);
}
