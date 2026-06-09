'use client';

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import type { useAcquisition, useSubscribers, useTimeseries } from '@/hooks/use-dashboard';

const PLAN_LABELS: Record<string, string> = { free: 'Free', basico: 'Básico', plus: 'Plus', pro: 'Pro' };
// Color por tier (paleta DESIGN.md), de menor a mayor: cielo → teal → dorado.
const PLAN_COLORS: Record<string, string> = {
  free: '#7C8698',
  basico: '#5DB7E8',
  plus: '#408D99',
  pro: '#E3B23C',
};
const SOURCE_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  google: 'Google',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tv: 'TV',
  app_store: 'App Store',
  noticias: 'Noticias',
  recomendacion: 'Recomendación',
  otro: 'Otro',
  desconocido: 'Desconocido',
};
const acqChartConfig = {
  count: { label: 'Usuarios', color: 'var(--chart-1)' },
} satisfies ChartConfig;
const subsChartConfig = {
  count: { label: 'Suscriptores', color: 'var(--chart-1)' },
} satisfies ChartConfig;
const tsChartConfig = {
  newUsers: { label: 'Nuevos', color: 'var(--chart-1)' },
  practiceSessions: { label: 'Sesiones', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const fmt = (n: number | undefined): string => (n ?? 0).toLocaleString('es-CR');

export function DashboardCharts({
  timeseries,
  subscribers,
  acquisition,
}: {
  timeseries: ReturnType<typeof useTimeseries>;
  subscribers: ReturnType<typeof useSubscribers>;
  acquisition: ReturnType<typeof useAcquisition>;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Actividad diaria</CardTitle>
          <CardDescription>Nuevos registros y sesiones de práctica por día.</CardDescription>
        </CardHeader>
        <CardContent>
          {timeseries.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : timeseries.isError ? (
            <p className="text-destructive text-sm">No se pudo cargar la serie temporal.</p>
          ) : (timeseries.data?.points.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">Sin datos en el período.</p>
          ) : (
            <ChartContainer config={tsChartConfig} className="h-56 w-full">
              <LineChart data={timeseries.data!.points} margin={{ left: 4, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="newUsers" stroke="var(--color-newUsers)" dot={false} strokeWidth={2} />
                <Line dataKey="practiceSessions" stroke="var(--color-practiceSessions)" dot={false} strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suscriptores por plan</CardTitle>
          <CardDescription>
            Suscripciones activas
            {subscribers.data ? ` · ${fmt(subscribers.data.total)} en total` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscribers.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : subscribers.isError ? (
            <p className="text-destructive text-sm">No se pudieron cargar los suscriptores.</p>
          ) : (subscribers.data?.byPlan.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">Sin suscripciones activas en el scope.</p>
          ) : (
            <ChartContainer config={subsChartConfig} className="h-48 w-full">
              <BarChart
                data={subscribers.data!.byPlan.map((p) => ({
                  plan: PLAN_LABELS[p.plan] ?? p.plan,
                  count: p.count,
                  key: p.plan,
                }))}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="plan" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={4}>
                  {subscribers.data!.byPlan.map((p) => (
                    <Cell key={p.plan} fill={PLAN_COLORS[p.plan] ?? 'var(--color-count)'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adquisición</CardTitle>
          <CardDescription>De dónde vienen los usuarios nuevos del período.</CardDescription>
        </CardHeader>
        <CardContent>
          {acquisition.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : acquisition.isError ? (
            <p className="text-destructive text-sm">No se pudo cargar la adquisición.</p>
          ) : (acquisition.data?.breakdown.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">Sin registros nuevos en el período.</p>
          ) : (
            <ChartContainer config={acqChartConfig} className="h-48 w-full">
              <BarChart
                data={acquisition.data!.breakdown.map((s) => ({
                  source: SOURCE_LABELS[s.source] ?? s.source,
                  count: s.count,
                }))}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="source" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}
