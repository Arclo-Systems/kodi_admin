'use client';

import { useState } from 'react';
import {
  BadgeDollarSignIcon,
  BarChart3Icon,
  ClockIcon,
  PercentIcon,
  UserPlusIcon,
  UsersIcon,
  XCircleIcon,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { KpiCard } from '@/components/admin/kpi-card';
import { PeriodSelector, periodToRange, type PeriodValue } from '@/components/admin/period-selector';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CountryFilter } from '@/components/admin/country-filter';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { COUNTRIES, type CountryCode } from '@/lib/countries';
import { useMonetizationAnalytics } from '@/hooks/use-monetization-analytics';

const fmt = (n: number | undefined): string => (n ?? 0).toLocaleString('es-CR');
const chartConfig = { count: { label: 'Subs', color: 'var(--chart-1)' } } satisfies ChartConfig;
const COUNTRY_LABEL = new Map(COUNTRIES.map((c) => [c.code as string, c.label]));
const countryLabel = (code: string): string =>
  code === 'GLOBAL' ? 'Sin país' : COUNTRY_LABEL.has(code) ? `${code} · ${COUNTRY_LABEL.get(code)}` : code;
const fmtMoney = (cents: number): string =>
  (cents / 100).toLocaleString('es-CR', { minimumFractionDigits: 2 });

// Trunca a la hora en punto. periodToRange usa `new Date()`, así que sin truncar, from/to cambiarían
// en cada milisegundo (cada render) → la queryKey nunca se estabiliza y react-query refetchea en
// bucle. Truncar a la hora mantiene el valor estable entre renders pero deja que el rango avance con
// el tiempo (no se congela al montar, como pasaría con un useMemo). La granularidad de hora sobra
// para un rango de días.
function hourIso(d: Date): string {
  const t = new Date(d);
  t.setMinutes(0, 0, 0);
  return t.toISOString();
}

// Rango de la consulta. 'custom' usa las fechas elegidas (hasta tener ambas, el backend aplica su
// default); los presets se truncan a la hora (queryKey estable, sin refetch en bucle). Ambos casos
// son estables entre renders, así que no hace falta memoizar.
function computeRange(
  period: PeriodValue,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string } {
  if (period === 'custom') {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : undefined,
      to: customTo ? new Date(customTo).toISOString() : undefined,
    };
  }
  const r = periodToRange(period);
  return { from: hourIso(r.from), to: hourIso(r.to) };
}

export function MonetizationAnalytics({ allowedCountries }: { allowedCountries: string[] }) {
  const [period, setPeriod] = useState<PeriodValue>('30d');
  const [countries, setCountries] = useState<CountryCode[]>([]);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const { from, to } = computeRange(period, customFrom, customTo);
  const { data, isLoading, isError } = useMonetizationAnalytics({ from, to, country: countries });

  const mrrEntries = Object.entries(data?.mrrEstimatedCents ?? {});
  const mrrByCountry = data?.mrrByCountry ?? [];

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
        <h2 className="text-muted-foreground text-sm font-medium">Movimiento (período)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Nuevas suscripciones" value={fmt(data?.newSubscriptions)} loading={isLoading} tone="green" icon={<UserPlusIcon />} />
          <KpiCard label="Canceladas" value={fmt(data?.cancelled)} loading={isLoading} goodDirection="down" tone="amber" icon={<XCircleIcon />} />
          <KpiCard label="Expiradas" value={fmt(data?.expired)} loading={isLoading} goodDirection="down" tone="amber" icon={<ClockIcon />} />
        </div>
        {isError && <p className="text-destructive text-sm">No se pudo cargar la analítica de monetización.</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">Snapshot actual</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="En trial" value={fmt(data?.trials)} loading={isLoading} tone="blue" icon={<UsersIcon />} />
          <KpiCard label="Pagos activos" value={fmt(data?.activePaid)} loading={isLoading} tone="green" icon={<UsersIcon />} />
          <KpiCard label="% pagos (vs trials)" value={`${Math.round((data?.paidShare ?? 0) * 100)}%`} loading={isLoading} tone="blue" icon={<PercentIcon />} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">MRR estimado (mensual)</h2>
        {mrrEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Cargando…' : 'Sin MRR — configurá precios en «Precios de planes».'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mrrEntries.map(([cur, cents]) => (
              <KpiCard
                key={cur}
                label={`MRR estimado (${cur})`}
                value={(cents / 100).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                loading={isLoading}
                tone="teal"
                icon={<BadgeDollarSignIcon />}
              />
            ))}
          </div>
        )}
      </section>

      {mrrByCountry.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-medium">MRR por país (mensual)</h2>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>País</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead className="text-right">MRR estimado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mrrByCountry.map((row) => (
                    <TableRow key={`${row.country}-${row.currency}`}>
                      <TableCell>{countryLabel(row.country)}</TableCell>
                      <TableCell>{row.currency}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(row.mrrCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="text-primary size-4" />
            Trials vs pagos activos
          </CardTitle>
          <CardDescription>Snapshot del scope actual.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="bg-muted h-40 w-full animate-pulse rounded" />
          ) : (
            <ChartContainer config={chartConfig} className="h-40 w-full">
              <BarChart data={[{ k: 'Trials', count: data?.trials ?? 0 }, { k: 'Pagos', count: data?.activePaid ?? 0 }]}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="k" tickLine={false} axisLine={false} />
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
