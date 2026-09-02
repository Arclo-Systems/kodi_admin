'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { WeekRow } from './advanced-stats-charts';

// recharts (~300 KB) solo lo necesita esta card, que vive bajo el fold de la ficha:
// va en un chunk aparte. El contenedor ya tiene el alto final, así que el skeleton
// ocupa exactamente el hueco del gráfico y la carga no mueve el layout.
const loading = () => <Skeleton className="h-full w-full" />;

const LazyWeeklyTrendChart = dynamic(
  () => import('./advanced-stats-charts').then((m) => m.WeeklyTrendChart),
  { ssr: false, loading },
);

export function WeeklyTrendChart({ data }: { data: WeekRow[] }) {
  return (
    <div className="h-40 w-full" aria-hidden>
      <LazyWeeklyTrendChart data={data} />
    </div>
  );
}
