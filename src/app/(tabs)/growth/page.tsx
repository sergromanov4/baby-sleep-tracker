'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useToast } from '@/components/feedback/useToast';
import AppSelect from '@/components/forms/AppSelect';
import { addGrowthEntry, deleteGrowthEntry, getActiveChild, listGrowthEntries } from '@/lib/repo';
import type { Child, GrowthEntry } from '@/lib/types';
import { ageInMonths, formatDateRu, fromYmd, toYmd } from '@/lib/time';
import {
  estimateLengthPercentile,
  estimateWeightPercentile,
  whoLengthForAge,
  whoWeightForAge,
} from '@/lib/who';

type GrowthMetric = 'weight' | 'height';

export default function GrowthPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header title="Рост и вес" />
          <div className="small">Загружаем данные…</div>
        </>
      }
    >
      <GrowthPageContent />
    </Suspense>
  );
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

function toGrowthMetric(value: string): GrowthMetric {
  return value === 'height' ? 'height' : 'weight';
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

  // Quick action: focus add form
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
        ? { value: lastWeight.w, date: lastWeight.date, unit: 'кг' as const }
        : null
      : lastHeight
        ? { value: lastHeight.h, date: lastHeight.date, unit: 'см' as const }
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

    // clear
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

    // axes
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, plotW, plotH);

    // helper for polyline
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

    // user points
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

      // connect
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

    // labels
    ctx.fillStyle = 'rgba(248,250,252,0.75)';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText('0м', padding, heightPx - 6);
    ctx.fillText('24м', width - padding - 24, heightPx - 6);
    const unit = metric === 'weight' ? 'кг' : 'см';
    ctx.fillText(`${maxV.toFixed(1)}${unit}`, padding + 4, padding + 12);
    ctx.fillText(`${minV.toFixed(1)}${unit}`, padding + 4, heightPx - padding - 4);
  }, [child, weightPoints, heightPoints, metric]);

  if (!child) {
    return (
      <>
        <Header title="Рост и вес" />
        <div className="card">
          <div className="small">Сначала добавьте ребенка в профиле.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Рост и вес" />

      <div className="stack">
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900 }}>
              {metric === 'weight' ? 'Вес по возрасту' : 'Рост по возрасту'} (WHO P3/P50/P97)
            </div>
            <AppSelect
              value={metric}
              onChange={(nextMetric) => setMetric(nextMetric)}
              options={[
                { value: 'weight', label: 'Вес' },
                { value: 'height', label: 'Рост' },
              ]}
              style={{ maxWidth: 160 }}
            />
          </div>
          <canvas ref={canvasRef} className="canvas" style={{ height: 220 }} />
          <div className="small">Линии: P3/P50/P97. Белые точки — ваши замеры.</div>
          {activeMeasurement && percentile ? (
            <div className="small">
              Последний замер: <b>{`${activeMeasurement.value} ${activeMeasurement.unit}`}</b> (
              {formatDateRu(activeMeasurement.date)}), около <b>{percentile.near}</b>
              {percentile.bucket === 'below3' ? ' (ниже P3)' : ''}
              {percentile.bucket === 'above97' ? ' (выше P97)' : ''}
            </div>
          ) : (
            <div className="small">
              Добавьте хотя бы один замер, чтобы увидеть позицию на графике.
            </div>
          )}
        </div>

        <div className="card stack">
          <div style={{ fontWeight: 900 }}>Добавить замер</div>
          <div ref={addRef} />

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }} className="field">
              <div className="label">Дата</div>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }} className="field">
              <div className="label">Вес, кг</div>
              <input
                className="input"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="например 7.2"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }} className="field">
              <div className="label">Рост, см</div>
              <input
                className="input"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="например 64"
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
              show('Добавлено');
            }}
          >
            Сохранить
          </button>

          <div className="small">Возраст на дату считается автоматически из даты рождения.</div>
        </div>

        <div className="card stack">
          <div style={{ fontWeight: 900 }}>История</div>
          {entries.length === 0 ? <div className="small">Пока нет замеров.</div> : null}

          <div className="list">
            {historyEntries.map((e) => (
              <div key={e.id} className="listItem">
                <div>
                  <div className="listItemTitle">{formatDateRu(e.date)}</div>
                  <div className="listItemSub">
                    {typeof e.weightKg === 'number' ? `${e.weightKg} кг` : '—'} ·{' '}
                    {typeof e.heightCm === 'number' ? `${e.heightCm} см` : '—'}
                  </div>
                </div>
                <button
                  className="button"
                  onClick={async () => {
                    await deleteGrowthEntry(e.id);
                    await refresh(child);
                    show('Удалено (можно восстановить через бэкап позже)');
                  }}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="small">
            Данные кривых: WHO Child Growth Standards, simplified field tables (percentiles), 0–24
            месяцев.
          </div>
        </div>
      </div>

      {Toast}
    </>
  );
}
