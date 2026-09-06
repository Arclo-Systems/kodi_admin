'use client';

import { useMemo, useState } from 'react';
import { CircleCheckIcon, ScaleIcon, TriangleAlertIcon } from 'lucide-react';
import { FINANCE_CURRENCIES } from '@/hooks/use-finance';
import {
  useBudgetVariance,
  type VarianceComparison,
  type BudgetVariance,
} from '@/hooks/use-finance-planning';
import { ApiError } from '@/lib/bff';
import { cn } from '@/lib/utils';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ACCOUNT_TYPE_LABELS, MONTH_OPTIONS, formatMoney } from './finance-format';
import { MetricValue } from './finance-metric';
import { FinanceReportCsvButton } from './finance-report-csv-button';

const COLUMNS = 6;
const YEARS_OFFERED = 3;

/**
 * Presupuesto contra real del mes, cuenta por cuenta.
 *
 * `favorable` NO se deduce del signo: en un ingreso cobrar de más juega a favor
 * y en un gasto es lo contrario, así que dos filas con la misma variación pueden
 * significar cosas opuestas. Por eso el tono lo decide el backend y el panel lo
 * repite con un icono y un texto, no solo con un color.
 */
export function FinanceBudgetVariance() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [currency, setCurrency] = useState<string>(FINANCE_CURRENCIES[0]);

  const years = useMemo(
    () => Array.from({ length: YEARS_OFFERED }, (_, i) => now.getFullYear() + 1 - i),
    // El año en curso no cambia mientras la pantalla está abierta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const params = { year, month, currency };
  const { data: report, isLoading, isError, error, refetch } = useBudgetVariance(params);

  // 404 con nombre: NO hay presupuesto de ese período. Comparar el real contra
  // un presupuesto de ceros mostraría 100 % de sobregiro en cada cuenta de un
  // mes que nadie presupuestó, así que el backend se niega y el panel lo explica.
  const sinPresupuesto = error instanceof ApiError && error.code === 'BUDGET_NOT_FOUND';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28" size="sm" aria-label="Año de la variación">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-40" size="sm" aria-label="Mes de la variación">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-28" size="sm" aria-label="Moneda de la variación">
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
        <FinanceReportCsvButton report="budget-variance" params={params} className="ml-auto" />
      </div>

      {sinPresupuesto && (
        <Alert>
          <AlertDescription>
            No hay presupuesto de ese mes en {currency}. Creá uno arriba: comparar el real contra un
            presupuesto de ceros diría que cada cuenta se pasó el 100 % de algo que nadie presupuestó.
          </AlertDescription>
        </Alert>
      )}

      {isError && !sinPresupuesto && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error ? error.message : 'No se pudo cargar la variación.'}
            </span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScaleIcon className="text-primary size-4" />
            Presupuesto contra real
            {report && (
              <span className="text-muted-foreground text-sm font-normal">
                · {report.budget.name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-right">Presupuesto</TableHead>
                <TableHead className="text-right">Real</TableHead>
                <TableHead className="text-right">Variación</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: COLUMNS }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : report ? (
                <VarianceRows report={report} />
              ) : (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="text-muted-foreground py-8 text-center">
                    {sinPresupuesto
                      ? 'Elegí un mes con presupuesto cargado.'
                      : 'Sin datos para el período elegido.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function VarianceRows({ report }: { report: BudgetVariance }) {
  return (
    <>
      {report.lines.map((line) => (
        <TableRow key={`${line.code}-${line.accountId ?? 'sin-presupuestar'}`}>
          <TableCell className="text-muted-foreground tabular-nums">{line.code}</TableCell>
          <TableCell>
            <span className="font-medium">{line.name}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {ACCOUNT_TYPE_LABELS[line.type]}
            </span>
            {line.accountId === null && (
              // Se movió sin estar presupuestada: no es un error del reporte, es
              // gasto que nadie previó, y esconderlo sería lo peor que puede
              // hacer una comparación contra presupuesto.
              <p className="text-muted-foreground text-xs italic">Sin presupuestar: solo real.</p>
            )}
          </TableCell>
          <ComparisonCells comparison={line} currency={report.currency} />
        </TableRow>
      ))}

      {report.totalsByType.map((total) => (
        <TableRow key={total.type} className="bg-muted/40 hover:bg-muted/40">
          <TableCell colSpan={2} className="font-semibold">
            {ACCOUNT_TYPE_LABELS[total.type]}
          </TableCell>
          <ComparisonCells comparison={total} currency={report.currency} bold />
        </TableRow>
      ))}

      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={2} className="font-semibold">
          Resultado neto
          <p className="text-muted-foreground text-xs font-normal">
            Ingresos − costo de ingresos − gastos operativos.
          </p>
        </TableCell>
        <ComparisonCells comparison={report.net} currency={report.currency} bold />
      </TableRow>
    </>
  );
}

function ComparisonCells({
  comparison,
  currency,
  bold = false,
}: {
  comparison: VarianceComparison;
  currency: string;
  bold?: boolean;
}) {
  const weight = bold ? 'font-semibold' : undefined;
  const Icon = comparison.favorable ? CircleCheckIcon : TriangleAlertIcon;

  return (
    <>
      <TableCell className={cn('text-right tabular-nums', weight)}>
        {formatMoney(comparison.budget)}
      </TableCell>
      <TableCell className={cn('text-right tabular-nums', weight)}>
        {formatMoney(comparison.actual)}
      </TableCell>
      <TableCell className="text-right">
        <span
          className={cn(
            'inline-flex items-center gap-1 tabular-nums',
            comparison.favorable ? 'text-success' : 'text-destructive',
            weight,
          )}
        >
          {formatMoney(comparison.variance)}
          <Icon className="size-3.5" aria-hidden />
          {/* El color no puede ser la única señal: la palabra viaja para quien
              no lo distingue y para el lector de pantalla. */}
          <span className="sr-only">{comparison.favorable ? 'a favor' : 'en contra'}</span>
        </span>
      </TableCell>
      <TableCell className={cn('text-right', weight)}>
        <MetricValue
          metric={comparison.variancePercent}
          currency={currency}
          className="justify-end"
        />
      </TableCell>
    </>
  );
}
