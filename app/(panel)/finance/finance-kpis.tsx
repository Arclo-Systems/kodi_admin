'use client';

import { useMemo, useState } from 'react';
import { InfoIcon } from 'lucide-react';
import { FINANCE_CURRENCIES } from '@/hooks/use-finance';
import { KPI_METRIC_KEYS, useFinanceKpis } from '@/hooks/use-finance-planning';
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
import { KPI_TITLES, formatPeriod, monthName } from './finance-format';
import { MetricValue } from './finance-metric';

// El mes en curso no es un período elegible más: es la ausencia de período, y el
// backend lo trata así (sin `year`/`month` mira el mes corriente, y mandar uno
// solo de los dos es 400). Un único `Select` con este centinela hace que el
// estado del panel NO pueda representar la combinación que el backend rechaza.
const CURRENT_MONTH = 'CURRENT';
const MONTHS_OFFERED = 24;

type Period = { year: number; month: number };

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {KPI_METRIC_KEYS.map((key) => {
          const metric = data?.metrics[key];
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {KPI_TITLES[key]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading || !metric ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      <MetricValue metric={metric} currency={data.currency} />
                    </div>
                    {/* La definición viene del backend con el número: escribirla
                        acá la dejaría desfasada de la fórmula el día que cambie. */}
                    <p className="text-muted-foreground text-xs">{metric.label}</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
