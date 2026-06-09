'use client';

import { useMemo, useState } from 'react';
import {
  BookOpenIcon,
  CircleHelpIcon,
  CoinsIcon,
  GiftIcon,
  GraduationCapIcon,
  ShoppingBagIcon,
  TargetIcon,
  TicketIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { KpiCard } from '@/components/admin/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodSelector, periodToRange, type PeriodValue } from '@/components/admin/period-selector';
import { CountryFilter } from '@/components/admin/country-filter';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { CountryCode } from '@/lib/countries';
import {
  useAcquisition,
  useEconomy,
  useEngagement,
  useExamsPassed,
  useRetention,
  useSubscribers,
  useTimeseries,
} from '@/hooks/use-dashboard';

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
const fmt = (n: number | undefined): string => (n ?? 0).toLocaleString('es-CR');
const pct = (rate: number | undefined): string => `${Math.round((rate ?? 0) * 100)}%`;
const subsChartConfig = {
  count: { label: 'Suscriptores', color: 'var(--chart-1)' },
} satisfies ChartConfig;
const tsChartConfig = {
  newUsers: { label: 'Nuevos', color: 'var(--chart-1)' },
  practiceSessions: { label: 'Sesiones', color: 'var(--chart-2)' },
} satisfies ChartConfig;

export function DashboardOverview({ allowedCountries }: { allowedCountries: string[] }) {
  const [period, setPeriod] = useState<PeriodValue>('30d');
  const [countries, setCountries] = useState<CountryCode[]>([]);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // 'custom' usa el rango from/to elegido; hasta tener ambas fechas, el backend aplica su default.
  const range = useMemo(() => {
    if (period === 'custom') {
      return {
        from: customFrom ? new Date(customFrom).toISOString() : undefined,
        to: customTo ? new Date(customTo).toISOString() : undefined,
      };
    }
    const r = periodToRange(period);
    return { from: r.from.toISOString(), to: r.to.toISOString() };
  }, [period, customFrom, customTo]);
  const query = { from: range.from, to: range.to, country: countries };

  const engagement = useEngagement(query);
  const economy = useEconomy(query);
  const subscribers = useSubscribers(query);
  const timeseries = useTimeseries(query);
  const retention = useRetention(query);
  const acquisition = useAcquisition(query);
  const examsPassed = useExamsPassed(query);
  const e = engagement.data;
  const ec = economy.data;
  const r = retention.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <PeriodSelector value={period} onChange={setPeriod} />
        {period === 'custom' && (
          <DateRangePicker
            from={customFrom}
            to={customTo}
            onChange={(f, t) => {
              setCustomFrom(f);
              setCustomTo(t);
            }}
            placeholder="Elegí el rango"
            aria-label="Rango personalizado"
            className="w-auto"
          />
        )}
        <CountryFilter value={countries} onChange={setCountries} allowedCountries={allowedCountries} />
      </div>

      <section className="space-y-3">
        <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <span className="bg-primary size-1.5 rounded-full" aria-hidden />
          Engagement
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Activos hoy (DAU)" value={fmt(e?.activeUsers.dau)} loading={engagement.isLoading} icon={<UsersIcon className="size-4" />} />
          <KpiCard label="Activos 7 días (WAU)" value={fmt(e?.activeUsers.wau)} loading={engagement.isLoading} icon={<UsersIcon className="size-4" />} />
          <KpiCard label="Activos 30 días (MAU)" value={fmt(e?.activeUsers.mau)} loading={engagement.isLoading} icon={<UsersIcon className="size-4" />} />
          <KpiCard label="Nuevos registros" value={fmt(e?.newUsers)} loading={engagement.isLoading} icon={<UserPlusIcon className="size-4" />} />
          <KpiCard label="Sesiones de práctica" value={fmt(e?.practiceSessions)} loading={engagement.isLoading} icon={<BookOpenIcon className="size-4" />} />
          <KpiCard label="Preguntas respondidas" value={fmt(e?.questionsAnswered)} loading={engagement.isLoading} icon={<CircleHelpIcon className="size-4" />} />
        </div>
        {engagement.isError && (
          <p className="text-destructive text-sm">No se pudieron cargar las métricas de engagement.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <span className="bg-info size-1.5 rounded-full" aria-hidden />
          Exámenes aprobados
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard
            label="Exámenes aprobados"
            value={fmt(examsPassed.data?.passed)}
            loading={examsPassed.isLoading}
            tone="blue"
            icon={<GraduationCapIcon className="size-4" />}
          />
          <KpiCard
            label="Tasa de aprobación"
            value={pct(examsPassed.data?.rate)}
            loading={examsPassed.isLoading}
            tone="blue"
            icon={<TargetIcon className="size-4" />}
          />
        </div>
        {examsPassed.isError ? (
          <p className="text-destructive text-sm">No se pudo cargar la métrica de exámenes.</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Auto-reportados por los usuarios (sobre el total de usuarios reales del scope).
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <span className="bg-warning size-1.5 rounded-full" aria-hidden />
          Economía
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Kokos otorgados" value={fmt(ec?.kokos.granted)} loading={economy.isLoading} tone="amber" icon={<CoinsIcon className="size-4" />} />
          <KpiCard label="Kokos gastados" value={fmt(ec?.kokos.spent)} loading={economy.isLoading} tone="amber" icon={<CoinsIcon className="size-4" />} />
          <KpiCard label="Compras en tienda" value={fmt(ec?.storePurchases)} loading={economy.isLoading} tone="amber" icon={<ShoppingBagIcon className="size-4" />} />
          <KpiCard label="Canjes de cupones" value={fmt(ec?.couponRedemptions)} loading={economy.isLoading} tone="amber" icon={<TicketIcon className="size-4" />} />
          <KpiCard label="Premiaciones" value={fmt(ec?.raffleAwards)} loading={economy.isLoading} tone="amber" icon={<GiftIcon className="size-4" />} />
        </div>
        {economy.isError && (
          <p className="text-destructive text-sm">No se pudieron cargar las métricas de economía.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <span className="bg-success size-1.5 rounded-full" aria-hidden />
          Retención de cohorte (registrados en el período)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Cohorte" value={fmt(r?.cohortSize)} loading={retention.isLoading} tone="green" icon={<UserPlusIcon className="size-4" />} />
          <KpiCard label="Retención D1" value={pct(r?.d1.rate)} loading={retention.isLoading} tone="green" icon={<TargetIcon className="size-4" />} />
          <KpiCard label="Retención D7" value={pct(r?.d7.rate)} loading={retention.isLoading} tone="green" icon={<TargetIcon className="size-4" />} />
        </div>
        {retention.isError ? (
          <p className="text-destructive text-sm">No se pudo cargar la retención.</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            % de los usuarios registrados en el período con una sesión de práctica el día reg+1 (D1) y reg+7 (D7).
          </p>
        )}
      </section>

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
    </div>
  );
}
