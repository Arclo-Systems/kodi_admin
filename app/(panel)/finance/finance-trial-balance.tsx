'use client';

import { useState } from 'react';
import { CircleCheckIcon, DownloadIcon, ScaleIcon, TriangleAlertIcon } from 'lucide-react';
import {
  FINANCE_CURRENCIES,
  financeReportCsvHref,
  useFinanceTrialBalance,
} from '@/hooks/use-finance';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
import { TableEmptyRow } from '@/components/admin/empty-state';
import { StatusBadge } from '@/lib/status-badge';
import { civilDayEndIso, civilDayStartIso } from '@/lib/civil-date';
import { ACCOUNT_TYPE_LABELS, formatMoney } from './finance-format';

const COLUMNS = 6;

export function FinanceTrialBalance() {
  const [currency, setCurrency] = useState<string>(FINANCE_CURRENCIES[0]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = {
    currency,
    from: from ? civilDayStartIso(from) : undefined,
    to: to ? civilDayEndIso(to) : undefined,
  };
  const { data: report, isLoading, isError, error } = useFinanceTrialBalance(params);

  return (
    <div className="space-y-4">
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
        <span className="text-muted-foreground text-sm">Sin fechas = últimos 12 meses.</span>
        <Button variant="outline" size="sm" className="ml-auto" asChild>
          <a href={financeReportCsvHref('trial-balance', params)} download>
            <DownloadIcon className="size-4" />
            Exportar CSV
          </a>
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : 'No se pudo cargar el balance de comprobación.'}
          </AlertDescription>
        </Alert>
      )}

      {/* El cuadre es el resultado del reporte, no un detalle: se muestra siempre,
          cuadre o no. Esconder una diferencia es lo único que un balance de
          comprobación no puede hacer. */}
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : report ? (
        report.balanced ? (
          <Card>
            <CardContent className="flex items-center gap-3">
              <StatusBadge tone="success" icon={CircleCheckIcon} label="Cuadra" />
              <span className="text-muted-foreground text-sm">
                Débitos y créditos coinciden en {report.currency}.
              </span>
            </CardContent>
          </Card>
        ) : (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>
              No cuadra: {formatMoney(report.difference)} {report.currency} de diferencia entre
              débitos y créditos en el período.
            </AlertDescription>
          </Alert>
        )
      ) : null}

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Clase</TableHead>
                <TableHead className="text-right">Débitos</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
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
                      <TableCell className="tabular-nums">{a.code}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {ACCOUNT_TYPE_LABELS[a.type]}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(a.debits)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(a.credits)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(a.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="font-semibold">
                      Totales
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(report.totals.debits)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(report.totals.credits)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right">—</TableCell>
                  </TableRow>
                  {/* La diferencia viaja también cuando es cero: que esté siempre a
                      la vista es lo que hace verificable el cuadre. */}
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="font-semibold">
                      Diferencia (débitos − créditos)
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(report.difference)}
                    </TableCell>
                  </TableRow>
                </>
              ) : (
                <TableEmptyRow
                  colSpan={COLUMNS}
                  icon={<ScaleIcon />}
                  message="Todavía no hay asientos en este período"
                  description="Probá con otro rango de fechas u otra moneda, o cargá el movimiento desde Movimientos."
                />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
