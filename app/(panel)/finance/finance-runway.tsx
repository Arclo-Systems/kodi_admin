'use client';

import { FuelIcon } from 'lucide-react';
import { useRunway } from '@/hooks/use-finance-planning';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAmount, formatMoney, formatPeriod } from './finance-format';
import { NotAvailableMark } from './finance-metric';

/**
 * Cuántos meses aguanta la caja al ritmo al que se está quemando.
 *
 * Saldo de caja ÷ quema promedio de los 3 últimos meses COMPLETOS, truncado
 * hacia abajo. Cuando no se puede calcular se dice N/A con el motivo: **nunca ∞
 * y nunca 0**. Las dos cifras que sí existen —el saldo y la quema— se muestran
 * igual, porque son la mitad de la explicación.
 */
export function FinanceRunway({ currency }: { currency: string }) {
  const { data: report, isLoading, isError, error, refetch } = useRunway(currency);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FuelIcon className="text-primary size-4" />
          Pista de caja ({currency})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>
                {error instanceof Error ? error.message : 'No se pudo cargar la pista de caja.'}
              </span>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading || !report ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Figure label="Saldo de caja" value={formatAmount(report.cashBalance, currency)} />
              <Figure
                label={`Quema promedio (${report.burn.basisMonths} meses completos)`}
                value={
                  report.burn.average === null ? null : formatAmount(report.burn.average, currency)
                }
                na={report.na}
              />
              <Figure
                label="Meses de pista"
                value={
                  report.runwayMonths === null ? null : `${formatMoney(report.runwayMonths)} meses`
                }
                na={report.na}
              />
            </div>

            {report.na && (
              <Alert>
                <AlertDescription>
                  {report.na.message} Por eso la pista dice N/A y no un número: un cero se leería
                  como una medición y un infinito, como que no hay problema.
                </AlertDescription>
              </Alert>
            )}

            {/* La asimetría se nombra: el saldo de caja SÍ incluye el mes en
                curso (es el saldo de hoy) y el promedio no. Sin decirlo, la
                diferencia entre las dos cifras se lee como un error. */}
            <p className="text-muted-foreground text-xs">
              {formatPeriod(report.burn.excludedCurrentMonth)} no entra en el promedio por estar en
              curso, aunque sus movimientos sí están en el saldo de caja.
              {report.burn.excludedPartialMonth &&
                ` ${formatPeriod(report.burn.excludedPartialMonth)} tampoco: el libro arrancó adentro de ese mes, así que no fue un mes entero de operación.`}
            </p>

            {report.burn.months.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs">
                  Quema de cada mes completo (salidas − entradas de caja). Un mes sin movimiento
                  entra en cero: omitirlo subiría el promedio.
                </p>
                <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-3">
                  {report.burn.months.map((m) => (
                    <li key={m.month} className="tabular-nums">
                      <span className="text-muted-foreground">{formatPeriod(m.month)}: </span>
                      {formatAmount(m.burn, currency)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Figure({
  label,
  value,
  na = null,
}: {
  label: string;
  value: string | null;
  na?: Parameters<typeof NotAvailableMark>[0]['reason'];
}) {
  return (
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      <div className="text-2xl font-bold tabular-nums">
        {value === null ? <NotAvailableMark reason={na} /> : value}
      </div>
    </div>
  );
}
