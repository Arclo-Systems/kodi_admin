'use client';

import { useQuery } from '@tanstack/react-query';
import { ActivityIcon, AlertTriangleIcon, CheckCircleIcon, DatabaseIcon } from 'lucide-react';
import { KpiCard } from '@/components/admin/kpi-card';
import { unwrapData } from '@/lib/bff';

type HealthData = {
  api?: { status: string; timestamp: string };
  db?: { active: number; max: number };
  redis?: { usedMemory: string; opsPerSec: number } | null;
  jobs?: {
    active: number;
    failed: number;
    waiting: number;
    completed: number;
    delayed: number;
  } | null;
  sentry?: { top5: unknown[] } | null;
};

export function HealthSummary() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthData> => {
      const res = await fetch('/api/admin/health/summary', { credentials: 'include' });
      if (!res.ok) throw new Error('fetch health failed');
      return unwrapData<HealthData>(await res.json()) ?? {};
    },
    refetchInterval: 30_000,
  });

  if (isError) {
    return (
      <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
        <AlertTriangleIcon className="size-4 shrink-0" />
        No se pudo cargar el estado de los servicios. Reintentá en unos segundos.
      </div>
    );
  }

  const apiOk = data?.api?.status === 'ok';
  const jobsFailed = data?.jobs?.failed ?? 0;
  const sentryErrors = data?.sentry?.top5.length ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        label="API"
        value={apiOk ? 'OK' : 'Caída'}
        loading={isLoading}
        tone={apiOk ? 'green' : 'red'}
        icon={apiOk ? <CheckCircleIcon /> : <AlertTriangleIcon />}
      />
      {data?.db && (
        <KpiCard
          label="DB conexiones"
          value={`${data.db.active} / ${data.db.max}`}
          loading={isLoading}
          tone="blue"
          icon={<DatabaseIcon />}
        />
      )}
      {data?.redis && (
        <KpiCard
          label="Redis"
          value={`${data.redis.usedMemory} · ${data.redis.opsPerSec} ops/s`}
          loading={isLoading}
          tone="blue"
          icon={<ActivityIcon />}
        />
      )}
      {data?.jobs && (
        <KpiCard
          label="Jobs fallidos"
          value={data.jobs.failed}
          loading={isLoading}
          goodDirection="down"
          tone={jobsFailed > 0 ? 'red' : 'green'}
          icon={jobsFailed > 0 ? <AlertTriangleIcon /> : <CheckCircleIcon />}
        />
      )}
      <KpiCard
        label="Sentry (errores recientes)"
        value={sentryErrors}
        loading={isLoading}
        tone={sentryErrors > 0 ? 'amber' : 'green'}
        icon={sentryErrors > 0 ? <AlertTriangleIcon /> : <CheckCircleIcon />}
      />
    </div>
  );
}
