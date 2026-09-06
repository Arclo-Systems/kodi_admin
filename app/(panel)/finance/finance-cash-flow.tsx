'use client';

import { useState } from 'react';
import { BarChart3Icon, WalletIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { FINANCE_CURRENCIES, useFinanceCashFlow } from '@/hooks/use-finance';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyRow } from '@/components/admin/empty-state';
import { civilDayEndIso, civilDayStartIso } from '@/lib/civil-date';
import { formatMoney } from './finance-format';
import { FinanceReportCsvButton } from './finance-report-csv-button';

const COLUMNS = 6;

// Los mismos dos colores que el P&L: entradas donde van los ingresos, salidas
// donde van los gastos. Que un color signifique lo mismo en las dos pantallas es
// lo que hace que no haya que leer la leyenda dos veces.
const chartConfig = {
  inflow: { label: 'Entradas', color: 'var(--chart-2)' },
  outflow: { label: 'Salidas', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const monthLabel = (m: string) => `${m.slice(5)}/${m.slice(2, 4)}`; // 'YYYY-MM' → 'MM/YY'

/**
 * Cuánta plata entró y salió de cada caja o banco, por moneda.
 *
 * No hay consolidado a propósito: el flujo se lee para saber si alcanza la
 * plata, y un total convertido diría que sí cuando la plata está en la caja
 * equivocada. Las cuentas son las HOJAS que cuelgan de `1100 Efectivo y
 * equivalentes` más `1220 Saldos por liquidar de tiendas`.
 */
export function FinanceCashFlow() {
  const [currency, setCurrency] = useState<string>(FINANCE_CURRENCIES[0]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = {
    currency,
    from: from ? civilDayStartIso(from) : undefined,
    to: to ? civilDayEndIso(to) : undefined,
  };
  const { data: report, isLoading, isError, error, refetch } = useFinanceCashFlow(params);

  // Recharts dibuja píxeles y necesita números: es el único punto donde el
  // importe deja de ser string, y no vuelve de ahí.
  const months = (report?.byMonth ?? []).map((m) => ({
    label: monthLabel(m.month),
    inflow: Number(m.inflow),
    outflow: Number(m.outflow),
  }));

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
        <DateRangePicker
          from={from}
          to={to}
          onChange={(f, t) => {
            setFrom(f);
            setTo(t);
          }}
          placeholder="Últimos 12 meses"
          aria-label="Rango de fechas"
          className="w-auto"
        />
        <span className="text-muted-foreground text-sm">
          Solo por moneda: un flujo consolidado no dice si alcanza la plata.
        </span>
        <FinanceReportCsvButton report="cash-flow" params={params} className="ml-auto" />
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error ? error.message : 'No se pudo cargar el flujo de caja.'}
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
            <WalletIcon className="text-primary size-4" />
            Cajas y bancos ({currency})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-right">Saldo inicial</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Salidas</TableHead>
                <TableHead className="text-right">Saldo final</TableHead>
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
              ) : report && report.accounts.length > 0 ? (
                <>
                  {report.accounts.map((a) => (
                    <TableRow key={a.accountId}>
                      <TableCell className="text-muted-foreground tabular-nums">{a.code}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(a.opening)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(a.inflow)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(a.outflow)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(a.closing)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={2} className="font-semibold">
                      Totales
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(report.totals.opening)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(report.totals.inflow)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(report.totals.outflow)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(report.totals.closing)}
                    </TableCell>
                  </TableRow>
                </>
              ) : (
                <TableEmptyRow
                  colSpan={COLUMNS}
                  icon={<WalletIcon />}
                  // Una caja sin movimiento igual aparece (en cero): que la tabla
                  // quede vacía significa que no hay cuentas de caja en esa
                  // moneda, no que no haya pasado nada.
                  message={isError ? 'No se pudo cargar' : 'No hay cuentas de caja o banco'}
                  description={
                    isError
                      ? 'Reintentá la carga para ver el flujo del rango.'
                      : `Son las cuentas hoja que cuelgan de 1100 Efectivo y equivalentes, más 1220. Probá con otra moneda o creá la caja en Cuentas.`
                  }
                />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="text-primary size-4" />
            Entradas vs salidas por mes ({currency})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="bg-muted h-56 w-full animate-pulse rounded" />
          ) : months.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin movimientos de caja en el rango.</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <BarChart data={months}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis width={64} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="inflow" fill="var(--color-inflow)" radius={4} />
                <Bar dataKey="outflow" fill="var(--color-outflow)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
