'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CoinsIcon, InfoIcon, RepeatIcon } from 'lucide-react';
import { FINANCE_CURRENCIES } from '@/hooks/use-finance';
import { useFinanceKpis, type KpiMetricKey, type Metric } from '@/hooks/use-finance-planning';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { KPI_TITLES, formatPeriod, monthName } from './finance-format';
import { MetricValue } from './finance-metric';

// El mes en curso no es un período elegible más: es la ausencia de período, y el
// backend lo trata así (sin `year`/`month` mira el mes corriente, y mandar uno
// solo de los dos es 400). Un único `Select` con este centinela hace que el
// estado del panel NO pueda representar la combinación que el backend rechaza.
const CURRENT_MONTH = 'CURRENT';
const MONTHS_OFFERED = 24;

type Period = { year: number; month: number };

// Los tres grupos, en el orden en que se leen: cuánta plata entró, cuántos
// clientes hay y qué sale de cruzarlos. `subscriptionRevenue` y `mrrEstimated`
// se pintan aparte, con más peso: son los dos que se confunden entre sí.
const SECUNDARIOS_DE_INGRESOS = ['arrFromRevenue', 'marketingSpend'] as const;
const CLIENTES = [
  'activeSubscriptions',
  'activeAtMonthStart',
  'newSubscriptions',
  'churnedSubscriptions',
] as const;
const RATIOS = ['churnRate', 'arpu', 'ltv', 'cac'] as const;

const VALUE_SIZE = { lg: 'text-3xl', md: 'text-2xl', sm: 'text-xl' } as const;

/** Los últimos N meses civiles, del más nuevo al más viejo, incluido el corriente. */
function recentMonths(now: Date, count: number): Period[] {
  const months: Period[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
}

const periodValue = (p: Period): string => `${p.year}-${String(p.month).padStart(2, '0')}`;

function parsePeriod(value: string): Period | undefined {
  if (value === CURRENT_MONTH) return undefined;
  const [year, month] = value.split('-');
  return { year: Number(year), month: Number(month) };
}

/**
 * KPIs de negocio del mes: caja de suscripciones, MRR estimado, clientes, churn,
 * ARPU, LTV y CAC.
 *
 * La regla que ordena toda la pantalla es una sola: **cuando el número no se
 * puede dar, se dice N/A con el motivo**. Un CAC de 0 se lee como "adquirir un
 * cliente sale gratis" y un LTV infinito como "nadie se va nunca"; ninguna de
 * las dos cosas es lo que muestran los datos de un mes sin altas o sin bajas.
 */
export function FinanceKpis() {
  const [currency, setCurrency] = useState<string>(FINANCE_CURRENCIES[0]);
  const [selected, setSelected] = useState<string>(CURRENT_MONTH);

  const months = useMemo(() => recentMonths(new Date(), MONTHS_OFFERED), []);
  const period = parsePeriod(selected);

  const { data, isLoading, isError, error, refetch } = useFinanceKpis({ currency, ...period });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-28" size="sm" aria-label="Moneda">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FINANCE_CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-56" size="sm" aria-label="Mes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CURRENT_MONTH}>Mes en curso</SelectItem>
            {months.map((m) => (
              <SelectItem key={periodValue(m)} value={periodValue(m)}>
                {monthName(m.month)} {m.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-muted-foreground text-sm">
          Los conteos son de clientes, no de suscripciones, y no se filtran por moneda.
        </span>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error instanceof Error ? error.message : 'No se pudieron cargar los KPIs.'}</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {data?.isCurrentMonth && (
        <Alert>
          <InfoIcon />
          <AlertDescription>
            {formatPeriod(data.period)} todavía no terminó: estas cifras van a seguir subiendo, y las
            bajas del mes cuentan suscripciones que aún pueden renovar.
          </AlertDescription>
        </Alert>
      )}

      {/* Tres preguntas distintas, tres bloques: cuánta plata entró, cuántos
          clientes hay y qué ratio sale de cruzarlos. Trece tarjetas iguales
          obligan a leerlas todas para encontrar una (regla #1 de DESIGN.md). */}
      {!isError && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Ingresos del mes</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Los dos números que se confunden entre sí van primero y más
                  grandes: son la caja cobrada y una foto del precio de lista. */}
              <MetricCard
                metricKey="subscriptionRevenue"
                metric={data?.metrics.subscriptionRevenue}
                currency={data?.currency ?? currency}
                loading={isLoading}
                size="lg"
                icon={<CoinsIcon />}
                iconClassName="bg-primary/10 text-primary"
              />
              <MetricCard
                metricKey="mrrEstimated"
                metric={data?.metrics.mrrEstimated}
                currency={data?.currency ?? currency}
                loading={isLoading}
                size="lg"
                icon={<RepeatIcon />}
                iconClassName="bg-info/10 text-info"
              />
              {SECUNDARIOS_DE_INGRESOS.map((key) => (
                <MetricCard
                  key={key}
                  metricKey={key}
                  metric={data?.metrics[key]}
                  currency={data?.currency ?? currency}
                  loading={isLoading}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Clientes</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CLIENTES.map((key) => (
                <MetricCard
                  key={key}
                  metricKey={key}
                  metric={data?.metrics[key]}
                  currency={data?.currency ?? currency}
                  loading={isLoading}
                  size="sm"
                />
              ))}
            </div>
            {/* Es el único conteo de FILAS entre cuatro de clientes: con la
                misma tarjeta se leería como uno más de ellos. */}
            {data && (
              <p className="text-muted-foreground text-sm">
                {KPI_TITLES.moduleSubscriptions}:{' '}
                <MetricValue
                  metric={data.metrics.moduleSubscriptions}
                  currency={data.currency}
                  className="text-foreground font-medium"
                />{' '}
                — {data.metrics.moduleSubscriptions.label}
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Ratios</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {RATIOS.map((key) => (
                <MetricCard
                  key={key}
                  metricKey={key}
                  metric={data?.metrics[key]}
                  currency={data?.currency ?? currency}
                  loading={isLoading}
                  size="sm"
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/**
 * Una métrica en su tarjeta. El nombre corto arriba, el número, y debajo la
 * definición que manda el backend con el dato: escribirla acá la dejaría
 * desfasada de la fórmula el día que cambie.
 */
function MetricCard({
  metricKey,
  metric,
  currency,
  loading,
  size = 'md',
  icon,
  iconClassName,
}: {
  metricKey: KpiMetricKey;
  metric: Metric | undefined;
  currency: string;
  loading: boolean;
  size?: keyof typeof VALUE_SIZE;
  icon?: ReactNode;
  iconClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {KPI_TITLES[metricKey]}
        </CardTitle>
        {icon && (
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4',
              iconClassName,
            )}
          >
            {icon}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {loading || !metric ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <>
            <div className={cn('font-bold', VALUE_SIZE[size])}>
              <MetricValue metric={metric} currency={currency} />
            </div>
            <p className="text-muted-foreground text-xs">{metric.label}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
