'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { SubjectRow, WeekRow } from './advanced-stats-charts';

// recharts (~300 KB) solo lo necesita esta card, que vive bajo el fold de la ficha:
// va en un chunk aparte. El contenedor ya tiene el alto final, así que el skeleton
// ocupa exactamente el hueco del gráfico y la carga no mueve el layout.
const loading = () => <Skeleton className="h-full w-full" />;

const LazySubjectAccuracyChart = dynamic(
  () => import('./advanced-stats-charts').then((m) => m.SubjectAccuracyChart),
  { ssr: false, loading },
);

const LazyWeeklyTrendChart = dynamic(
  () => import('./advanced-stats-charts').then((m) => m.WeeklyTrendChart),
  { ssr: false, loading },
);

const ROW_PX = 30;
const CHART_PADDING_PX = 16;

export function SubjectAccuracyChart({ data }: { data: SubjectRow[] }) {
  return (
    <div
      className="max-w-2xl"
      style={{ height: data.length * ROW_PX + CHART_PADDING_PX }}
      aria-hidden
    >
      <LazySubjectAccuracyChart data={data} />
    </div>
  );
}

export function WeeklyTrendChart({ data }: { data: WeekRow[] }) {
  return (
    <div className="h-52 max-w-2xl" aria-hidden>
      <LazyWeeklyTrendChart data={data} />
    </div>
  );
}
