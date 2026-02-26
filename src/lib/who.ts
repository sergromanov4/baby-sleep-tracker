import type { Sex } from './types';

// WHO Child Growth Standards – simplified field tables (percentiles)
// We use P3 / P50 (median) / P97 for 0–24 months.
// Sources are the official WHO “Simplified field tables” PDFs.

export type WhoPoint = { m: number; p3: number; p50: number; p97: number };

// Weight-for-age (kg), months 0..24
const WFA_BOYS: WhoPoint[] = [
  { m: 0, p3: 2.5, p50: 3.3, p97: 4.3 },
  { m: 1, p3: 3.4, p50: 4.5, p97: 5.7 },
  { m: 2, p3: 4.4, p50: 5.6, p97: 7.0 },
  { m: 3, p3: 5.1, p50: 6.4, p97: 7.9 },
  { m: 4, p3: 5.6, p50: 7.0, p97: 8.6 },
  { m: 5, p3: 6.1, p50: 7.5, p97: 9.2 },
  { m: 6, p3: 6.4, p50: 7.9, p97: 9.7 },
  { m: 7, p3: 6.7, p50: 8.3, p97: 10.2 },
  { m: 8, p3: 7.0, p50: 8.6, p97: 10.5 },
  { m: 9, p3: 7.2, p50: 8.9, p97: 10.9 },
  { m: 10, p3: 7.5, p50: 9.2, p97: 11.2 },
  { m: 11, p3: 7.7, p50: 9.4, p97: 11.5 },
  { m: 12, p3: 7.8, p50: 9.6, p97: 11.8 },
  { m: 13, p3: 8.0, p50: 9.9, p97: 12.1 },
  { m: 14, p3: 8.2, p50: 10.1, p97: 12.4 },
  { m: 15, p3: 8.4, p50: 10.3, p97: 12.7 },
  { m: 16, p3: 8.5, p50: 10.5, p97: 12.9 },
  { m: 17, p3: 8.7, p50: 10.7, p97: 13.2 },
  { m: 18, p3: 8.9, p50: 10.9, p97: 13.5 },
  { m: 19, p3: 9.0, p50: 11.1, p97: 13.7 },
  { m: 20, p3: 9.2, p50: 11.3, p97: 14.0 },
  { m: 21, p3: 9.3, p50: 11.5, p97: 14.3 },
  { m: 22, p3: 9.5, p50: 11.8, p97: 14.5 },
  { m: 23, p3: 9.7, p50: 12.0, p97: 14.8 },
  { m: 24, p3: 9.8, p50: 12.2, p97: 15.1 },
];

const WFA_GIRLS: WhoPoint[] = [
  { m: 0, p3: 2.4, p50: 3.2, p97: 4.2 },
  { m: 1, p3: 3.2, p50: 4.2, p97: 5.4 },
  { m: 2, p3: 4.0, p50: 5.1, p97: 6.5 },
  { m: 3, p3: 4.6, p50: 5.8, p97: 7.4 },
  { m: 4, p3: 5.1, p50: 6.4, p97: 8.1 },
  { m: 5, p3: 5.5, p50: 6.9, p97: 8.7 },
  { m: 6, p3: 5.8, p50: 7.3, p97: 9.2 },
  { m: 7, p3: 6.1, p50: 7.6, p97: 9.6 },
  { m: 8, p3: 6.3, p50: 7.9, p97: 10.0 },
  { m: 9, p3: 6.6, p50: 8.2, p97: 10.4 },
  { m: 10, p3: 6.8, p50: 8.5, p97: 10.7 },
  { m: 11, p3: 7.0, p50: 8.7, p97: 11.0 },
  { m: 12, p3: 7.1, p50: 8.9, p97: 11.3 },
  { m: 13, p3: 7.3, p50: 9.2, p97: 11.6 },
  { m: 14, p3: 7.5, p50: 9.4, p97: 11.9 },
  { m: 15, p3: 7.7, p50: 9.6, p97: 12.2 },
  { m: 16, p3: 7.8, p50: 9.8, p97: 12.5 },
  { m: 17, p3: 8.0, p50: 10.0, p97: 12.7 },
  { m: 18, p3: 8.2, p50: 10.2, p97: 13.0 },
  { m: 19, p3: 8.3, p50: 10.4, p97: 13.3 },
  { m: 20, p3: 8.5, p50: 10.6, p97: 13.5 },
  { m: 21, p3: 8.7, p50: 10.9, p97: 13.8 },
  { m: 22, p3: 8.8, p50: 11.1, p97: 14.1 },
  { m: 23, p3: 9.0, p50: 11.3, p97: 14.3 },
  { m: 24, p3: 9.2, p50: 11.5, p97: 14.6 },
];

// Length-for-age (cm), months 0..24
const LFA_BOYS: WhoPoint[] = [
  { m: 0, p3: 46.3, p50: 49.9, p97: 53.4 },
  { m: 1, p3: 51.1, p50: 54.7, p97: 58.4 },
  { m: 2, p3: 54.7, p50: 58.4, p97: 62.2 },
  { m: 3, p3: 57.6, p50: 61.4, p97: 65.3 },
  { m: 4, p3: 60.0, p50: 63.9, p97: 67.8 },
  { m: 5, p3: 61.9, p50: 65.9, p97: 69.9 },
  { m: 6, p3: 63.6, p50: 67.6, p97: 71.6 },
  { m: 7, p3: 65.1, p50: 69.2, p97: 73.2 },
  { m: 8, p3: 66.5, p50: 70.6, p97: 74.7 },
  { m: 9, p3: 67.7, p50: 72.0, p97: 76.2 },
  { m: 10, p3: 69.0, p50: 73.3, p97: 77.6 },
  { m: 11, p3: 70.2, p50: 74.5, p97: 78.9 },
  { m: 12, p3: 71.3, p50: 75.7, p97: 80.2 },
  { m: 13, p3: 72.4, p50: 76.9, p97: 81.5 },
  { m: 14, p3: 73.4, p50: 78.0, p97: 82.7 },
  { m: 15, p3: 74.4, p50: 79.1, p97: 83.9 },
  { m: 16, p3: 75.4, p50: 80.2, p97: 85.1 },
  { m: 17, p3: 76.3, p50: 81.2, p97: 86.2 },
  { m: 18, p3: 77.2, p50: 82.3, p97: 87.3 },
  { m: 19, p3: 78.1, p50: 83.2, p97: 88.4 },
  { m: 20, p3: 78.9, p50: 84.2, p97: 89.5 },
  { m: 21, p3: 79.7, p50: 85.1, p97: 90.5 },
  { m: 22, p3: 80.5, p50: 86.0, p97: 91.6 },
  { m: 23, p3: 81.3, p50: 86.9, p97: 92.6 },
  { m: 24, p3: 82.1, p50: 87.8, p97: 93.6 },
];

const LFA_GIRLS: WhoPoint[] = [
  { m: 0, p3: 45.6, p50: 49.1, p97: 52.7 },
  { m: 1, p3: 50.0, p50: 53.7, p97: 57.4 },
  { m: 2, p3: 53.2, p50: 57.1, p97: 60.9 },
  { m: 3, p3: 55.8, p50: 59.8, p97: 63.8 },
  { m: 4, p3: 58.0, p50: 62.1, p97: 66.2 },
  { m: 5, p3: 59.9, p50: 64.0, p97: 68.2 },
  { m: 6, p3: 61.5, p50: 65.7, p97: 70.0 },
  { m: 7, p3: 62.9, p50: 67.3, p97: 71.6 },
  { m: 8, p3: 64.3, p50: 68.7, p97: 73.2 },
  { m: 9, p3: 65.6, p50: 70.1, p97: 74.7 },
  { m: 10, p3: 66.8, p50: 71.5, p97: 76.1 },
  { m: 11, p3: 68.0, p50: 72.8, p97: 77.5 },
  { m: 12, p3: 69.2, p50: 74.0, p97: 78.9 },
  { m: 13, p3: 70.3, p50: 75.2, p97: 80.2 },
  { m: 14, p3: 71.3, p50: 76.4, p97: 81.4 },
  { m: 15, p3: 72.4, p50: 77.5, p97: 82.7 },
  { m: 16, p3: 73.3, p50: 78.6, p97: 83.9 },
  { m: 17, p3: 74.3, p50: 79.7, p97: 85.0 },
  { m: 18, p3: 75.2, p50: 80.7, p97: 86.2 },
  { m: 19, p3: 76.2, p50: 81.7, p97: 87.3 },
  { m: 20, p3: 77.0, p50: 82.7, p97: 88.4 },
  { m: 21, p3: 77.9, p50: 83.7, p97: 89.4 },
  { m: 22, p3: 78.7, p50: 84.6, p97: 90.5 },
  { m: 23, p3: 79.6, p50: 85.5, p97: 91.5 },
  { m: 24, p3: 80.3, p50: 86.4, p97: 92.5 },
];

export function whoWeightForAge(sex: Sex): WhoPoint[] {
  return sex === 'male' ? WFA_BOYS : WFA_GIRLS;
}

export function whoLengthForAge(sex: Sex): WhoPoint[] {
  return sex === 'male' ? LFA_BOYS : LFA_GIRLS;
}

function nearestByAge(data: WhoPoint[], ageMonths: number): WhoPoint {
  let best = data[0]!;
  for (const p of data) {
    if (Math.abs(p.m - ageMonths) < Math.abs(best.m - ageMonths)) best = p;
  }
  return best;
}

export function estimatePercentileFromP3P50P97(
  point: WhoPoint,
  value: number,
): { bucket: 'below3' | 'p3to50' | 'p50to97' | 'above97'; near: 'p3' | 'p50' | 'p97' } {
  const diffs: Array<{ key: 'p3' | 'p50' | 'p97'; d: number }> = [
    { key: 'p3' as const, d: Math.abs(value - point.p3) },
    { key: 'p50' as const, d: Math.abs(value - point.p50) },
    { key: 'p97' as const, d: Math.abs(value - point.p97) },
  ].sort((a, b) => a.d - b.d);

  let bucket: 'below3' | 'p3to50' | 'p50to97' | 'above97' = 'p3to50';
  if (value < point.p3) bucket = 'below3';
  else if (value < point.p50) bucket = 'p3to50';
  else if (value < point.p97) bucket = 'p50to97';
  else bucket = 'above97';

  return { bucket, near: diffs[0]!.key };
}

export function estimateWeightPercentile(
  sex: Sex,
  ageMonths: number,
  weightKg: number,
): { bucket: 'below3' | 'p3to50' | 'p50to97' | 'above97'; near: 'p3' | 'p50' | 'p97' } {
  const p = nearestByAge(whoWeightForAge(sex), ageMonths);
  return estimatePercentileFromP3P50P97(p, weightKg);
}

export function estimateLengthPercentile(
  sex: Sex,
  ageMonths: number,
  lengthCm: number,
): { bucket: 'below3' | 'p3to50' | 'p50to97' | 'above97'; near: 'p3' | 'p50' | 'p97' } {
  const p = nearestByAge(whoLengthForAge(sex), ageMonths);
  return estimatePercentileFromP3P50P97(p, lengthCm);
}
