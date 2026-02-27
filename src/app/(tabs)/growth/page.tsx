'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/feedback/useToast';
import AppSelect from '@/components/forms/AppSelect';
import { addGrowthEntry, deleteGrowthEntry, getActiveChild, listGrowthEntries } from '@/lib/repo';
import type { Child, GrowthEntry } from '@/lib/types';
import { ageInMonths, fromYmd, toYmd } from '@/lib/time';
import {
  estimateLengthPercentile,
  estimateWeightPercentile,
  whoLengthForAge,
  whoWeightForAge,
} from '@/lib/who';
import { useI18n } from '@/lib/i18n';

type GrowthMetric = 'weight' | 'height';

export default function GrowthPage() {
  return (
    <Suspense fallback={<GrowthFallback />}>
      <GrowthPageContent />
    </Suspense>
  );
}

function GrowthFallback() {
  const { t } = useI18n();
  return <div className="small">{t('growth.loading')}</div>;
}

function hasWeight(entry: GrowthEntry): entry is GrowthEntry & { weightKg: number } {
  return typeof entry.weightKg === 'number';
}

function hasHeight(entry: GrowthEntry): entry is GrowthEntry & { heightCm: number } {
  return typeof entry.heightCm === 'number';
}

function parseOptionalDecimal(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return undefined;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function GrowthPageContent() {
  const router = useRouter();
  const search = useSearchParams();
  const [child, setChild] = useState<Child | null>(null);
  const [entries, setEntries] = useState<GrowthEntry[]>([]);
  const [date, setDate] = useState(() => toYmd(new Date()));
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [metric, setMetric] = useState<GrowthMetric>('weight');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const addRef = useRef<HTMLDivElement | null>(null);
  const { show, Toast } = useToast();
  const { t, formatDateValue } = useI18n();

  const refresh = useCallback(async (c: Child) => {
    const list = await listGrowthEntries(c.id);
    setEntries(list);
  }, []);

  useEffect(() => {
    (async () => {
      const c = await getActiveChild();
      if (!c) return;
      setChild(c);
      await refresh(c);
    })();
  }, [refresh]);

  useEffect(() => {
    if (search?.get('add') !== '1') return;
    setTimeout(() => {
      addRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    router.replace('/growth');
  }, [search, router]);

  const weightPoints = useMemo(() => {
    if (!child) return [];
    return entries
      .filter(hasWeight)
      .map((e) => {
        const m = ageInMonths(child.dob, fromYmd(e.date));
        return { m, w: e.weightKg, date: e.date };
      })
      .sort((a, b) => a.m - b.m);
  }, [entries, child]);

  const heightPoints = useMemo(() => {
    if (!child) return [];
    return entries
      .filter(hasHeight)
      .map((e) => {
        const m = ageInMonths(child.dob, fromYmd(e.date));
        return { m, h: e.heightCm, date: e.date };
      })
      .sort((a, b) => a.m - b.m);
  }, [entries, child]);

  const lastWeight = weightPoints.length ? weightPoints[weightPoints.length - 1] : null;
  const lastHeight = heightPoints.length ? heightPoints[heightPoints.length - 1] : null;
  const historyEntries = useMemo(() => [...entries].reverse(), [entries]);

  const activeMeasurement =
    metric === 'weight'
      ? lastWeight
        ? { value: lastWeight.w, date: lastWeight.date, unit: 'kg' as const }
        : null
      : lastHeight
        ? { value: lastHeight.h, date: lastHeight.date, unit: 'cm' as const }
        : null;

  const percentile = useMemo(() => {
    if (!child) return null;
    if (metric === 'weight' && lastWeight)
      return estimateWeightPercentile(child.sex, lastWeight.m, lastWeight.w);
    if (metric === 'height' && lastHeight)
      return estimateLengthPercentile(child.sex, lastHeight.m, lastHeight.h);
    return null;
  }, [child, lastWeight, lastHeight, metric]);

  useEffect(() => {
    if (!child) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const heightPx = 220;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(heightPx * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, heightPx);

    const padding = 14;
    const plotW = width - padding * 2;
    const plotH = heightPx - padding * 2;

    const who = metric === 'weight' ? whoWeightForAge(child.sex) : whoLengthForAge(child.sex);

    const minM = 0;
    const maxM = 24;
    const minV = Math.min(...who.map((p) => p.p3)) - (metric === 'weight' ? 0.5 : 1.5);
    const maxV = Math.max(...who.map((p) => p.p97)) + (metric === 'weight' ? 0.5 : 1.5);

    const x = (m: number) =>
      padding + ((Math.min(maxM, Math.max(minM, m)) - minM) / (maxM - minM)) * plotW;
    const y = (v: number) => padding + ((maxV - v) / (maxV - minV)) * plotH;

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, plotW, plotH);

    const poly = (vals: Array<{ m: number; v: number }>, stroke: string) => {
      if (vals.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke;
      vals.forEach((p, idx) => {
        const px = x(p.m);
        const py = y(p.v);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    };

    poly(
      who.map((p) => ({ m: p.m, v: p.p3 })),
      'rgba(165,88,255,0.55)',
    );
    poly(
      who.map((p) => ({ m: p.m, v: p.p50 })),
      'rgba(46,169,255,0.70)',
    );
    poly(
      who.map((p) => ({ m: p.m, v: p.p97 })),
      'rgba(165,88,255,0.55)',
    );

    const pts =
      metric === 'weight'
        ? weightPoints.map((p) => ({ m: p.m, v: p.w }))
        : heightPoints.map((p) => ({ m: p.m, v: p.h }));

    if (pts.length) {
      ctx.fillStyle = 'rgba(248,250,252,0.92)';
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(x(p.m), y(p.v), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(248,250,252,0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = x(p.m);
        const py = y(p.v);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(248,250,252,0.75)';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText('0m', padding, heightPx - 6);
    ctx.fillText('24m', width - padding - 24, heightPx - 6);
    const unit = metric === 'weight' ? 'kg' : 'cm';
    ctx.fillText(`${maxV.toFixed(1)}${unit}`, padding + 4, padding + 12);
    ctx.fillText(`${minV.toFixed(1)}${unit}`, padding + 4, heightPx - padding - 4);
  }, [child, weightPoints, heightPoints, metric]);

  if (!child) {
    return (
      <>
        <div className="card">
          <div className="small">{t('growth.noChild')}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="stack">
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900 }}>
              {metric === 'weight' ? t('growth.weightByAge') : t('growth.heightByAge')} (WHO
              P3/P50/P97)
            </div>
            <AppSelect
              value={metric}
              onChange={(nextMetric) => setMetric(nextMetric)}
              options={[
                { value: 'weight', label: t('growth.metricWeight') },
                { value: 'height', label: t('growth.metricHeight') },
              ]}
              style={{ maxWidth: 160 }}
            />
          </div>
          <canvas ref={canvasRef} className="canvas" style={{ height: 220 }} />
          <div className="small">{t('growth.linesHint')}</div>
          {activeMeasurement && percentile ? (
            <div className="small">
              {t('growth.lastMeasurement', {
                value: `${activeMeasurement.value} ${activeMeasurement.unit}`,
                date: formatDateValue(activeMeasurement.date),
                near: percentile.near,
                extra:
                  percentile.bucket === 'below3'
                    ? t('growth.extraBelow3')
                    : percentile.bucket === 'above97'
                      ? t('growth.extraAbove97')
                      : '',
              })}
            </div>
          ) : (
            <div className="small">{t('growth.noMeasurement')}</div>
          )}
        </div>

        <div className="card stack">
          <div style={{ fontWeight: 900 }}>{t('growth.addMeasurement')}</div>
          <div ref={addRef} />

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }} className="field">
              <div className="label">{t('growth.date')}</div>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }} className="field">
              <div className="label">{t('growth.weightKg')}</div>
              <input
                className="input"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={t('growth.weightPlaceholder')}
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }} className="field">
              <div className="label">{t('growth.heightCm')}</div>
              <input
                className="input"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder={t('growth.heightPlaceholder')}
                inputMode="decimal"
              />
            </div>
            <div style={{ flex: 1 }} />
          </div>

          <button
            className="button buttonPrimary buttonFull"
            onClick={async () => {
              const w = parseOptionalDecimal(weight);
              const h = parseOptionalDecimal(height);
              await addGrowthEntry({
                childId: child.id,
                date,
                weightKg: w,
                heightCm: h,
              });
              await refresh(child);
              setWeight('');
              setHeight('');
              show(t('growth.toastAdded'));
            }}
          >
            {t('growth.save')}
          </button>

          <div className="small">{t('growth.ageAuto')}</div>
        </div>

        <div className="card stack">
          <div style={{ fontWeight: 900 }}>{t('growth.history')}</div>
          {entries.length === 0 ? <div className="small">{t('growth.noHistory')}</div> : null}

          <div className="list">
            {historyEntries.map((entry) => (
              <div key={entry.id} className="listItem">
                <div>
                  <div className="listItemTitle">{formatDateValue(entry.date)}</div>
                  <div className="listItemSub">
                    {typeof entry.weightKg === 'number' ? `${entry.weightKg} kg` : '—'} ·{' '}
                    {typeof entry.heightCm === 'number' ? `${entry.heightCm} cm` : '—'}
                  </div>
                </div>
                <button
                  className="button"
                  onClick={async () => {
                    await deleteGrowthEntry(entry.id);
                    await refresh(child);
                    show(t('growth.toastDeleted'));
                  }}
                >
                  {t('growth.delete')}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="small">{t('growth.whoSource')}</div>
        </div>
      </div>

      {Toast}
    </>
  );
}
