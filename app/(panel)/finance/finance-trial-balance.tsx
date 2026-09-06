'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpenIcon, CircleCheckIcon, ScaleIcon, TriangleAlertIcon } from 'lucide-react';
import { FINANCE_CURRENCIES, useFinanceTrialBalance } from '@/hooks/use-finance';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
import { ACCOUNT_TYPE_LABELS, formatMoney, ledgerHref } from './finance-format';
import {
  ConsolidationBanner,
  CurrencyScopeSelect,
  currencyScopeParams,
  type CurrencyScopeValue,
} from './finance-currency-scope';
import { FinanceReportCsvButton } from './finance-report-csv-button';

const COLUMNS = 7;

export function FinanceTrialBalance() {
  const [scope, setScope] = useState<CurrencyScopeValue>(FINANCE_CURRENCIES[0]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { currency, consolidateTo } = currencyScopeParams(scope);
  const params = {
    currency,
    consolidateTo,
    from: from ? civilDayStartIso(from) : undefined,
    to: to ? civilDayEndIso(to) : undefined,
  };
  const { data: report, isLoading, isError, error, refetch } = useFinanceTrialBalance(params);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CurrencyScopeSelect value={scope} onChange={setScope} />
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
        <FinanceReportCsvButton report="trial-balance" params={params} className="ml-auto" />
      </div>

      {report?.consolidation && (
        <>
          <ConsolidationBanner consolidation={report.consolidation} />
          <p className="text-muted-foreground text-sm">
            El mayor de una cuenta es de UNA moneda: volvé a una moneda para poder abrirlo desde
            acá.
          </p>
        </>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error
                ? error.message
                : 'No se pudo cargar el balance de comprobación.'}
            </span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
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
                <TableHead />
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
                      <TableCell>
                        <span className="font-medium">{a.name}</span>
                        {/* `1190` es la contrapartida temporal de una conversión,
                            no plata disponible: sin la etiqueta su saldo se lee
                            como una caja más. */}
                        {a.isBridge && (
                          <span className="text-muted-foreground block text-xs">
                            Traslados entre monedas: contrapartida de una conversión, no es efectivo
                            disponible.
                          </span>
                        )}
                      </TableCell>
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
                      {/* El saldo dice cuánto; el mayor dice de dónde salió. Se
                          abre con la misma moneda y el mismo rango. Consolidando
                          no hay una moneda que pasarle —un mayor que mezcla
                          monedas no es un saldo corrido—, así que el salto no se
                          ofrece. */}
                      <TableCell className="text-right">
                        {currency && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={ledgerHref({
                                accountId: a.accountId,
                                currency,
                                from: from || undefined,
                                to: to || undefined,
                              })}
                            >
                              <BookOpenIcon className="size-4" />
                              Mayor
                            </Link>
                          </Button>
                        )}
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
                    <TableCell />
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
                    <TableCell />
                  </TableRow>
                </>
              ) : (
                <TableEmptyRow
                  colSpan={COLUMNS}
                  icon={<ScaleIcon />}
                  // Un reporte caído deja la tabla igual de vacía que un período
                  // sin asientos, y las dos cosas piden lo contrario: una que se
                  // cambie el rango, la otra que se reintente la carga.
                  message={isError ? 'No se pudo cargar' : 'Todavía no hay asientos en este período'}
                  description={
                    isError
                      ? 'Reintentá la carga para ver el balance del período.'
                      : 'Probá con otro rango de fechas u otra moneda, o cargá el movimiento desde Movimientos.'
                  }
                />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
