'use client';

import { useMemo, useState } from 'react';
import { CircleCheckIcon, ScaleIcon, TriangleAlertIcon } from 'lucide-react';
import {
  FINANCE_CURRENCIES,
  useFinanceBalanceSheet,
  type BalanceSheetLine,
  type BalanceSheetSection,
} from '@/hooks/use-finance';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
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
import { civilDayEndIso } from '@/lib/civil-date';
import { cn } from '@/lib/utils';
import { formatMoney } from './finance-format';
import {
  ConsolidationBanner,
  CurrencyScopeSelect,
  currencyScopeParams,
  type CurrencyScopeValue,
} from './finance-currency-scope';
import { FinanceReportCsvButton } from './finance-report-csv-button';

const COLUMNS = 3;
const INDENT_REM = 1.25;

// Qué es cada fila que no es una cuenta más. El backend las marca; acá se
// explican, porque un "0,00" o un importe sin cuenta se lee como un error del
// reporte si nadie dice de dónde salió.
function lineHint(line: BalanceSheetLine): string | null {
  if (line.isBridge) {
    return line.valuation === 'historical'
      ? 'Valorada a tasa histórica: a la tasa de cada conversión el puente vale cero.'
      : 'Traslados entre monedas: contrapartida temporal de una conversión, no es efectivo disponible.';
  }
  if (line.valuation === 'cta') {
    return 'Calculada: diferencia de traducción a la tasa del cierre (NIC 21). No se realizó, así que no toca el resultado.';
  }
  if (line.computed) {
    return 'Calculada: el resultado del período todavía no se cerró contra patrimonio.';
  }
  return null;
}

function BalanceSection({
  title,
  section,
  currency,
  loading,
  failed,
}: {
  title: string;
  section: BalanceSheetSection | undefined;
  currency: string;
  loading: boolean;
  failed: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <span>{title}</span>
          <span className="tabular-nums">
            {loading || !section ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              `${formatMoney(section.total)} ${currency}`
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* `table-fixed`: con el ancho automático, la sangría de la rama
            (`paddingLeft` por profundidad) entra en el ancho mínimo del
            contenido y empuja la tabla más allá de la card — el contenedor
            `overflow-x-auto` de shadcn aparecía con scroll y la columna Código
            quedaba recortada. Con anchos declarados, las columnas no dependen
            del contenido y el nombre largo parte de línea en vez de ensanchar.
            El `min-w` deja el scroll solo donde de verdad no entra (móvil), y
            un contenedor arranca siempre en scrollLeft 0: alineado a la
            izquierda, con Código a la vista. */}
        <Table aria-label={title} className="min-w-[30rem] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Código</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead className="w-36 text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMNS }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : section && section.lines.length > 0 ? (
              section.lines.map((line) => <BalanceRow key={rowKey(line)} line={line} />)
            ) : (
              <TableEmptyRow
                colSpan={COLUMNS}
                icon={<ScaleIcon />}
                // Un reporte caído deja la sección igual de vacía que una sección
                // sin cuentas, y las dos cosas piden lo contrario: una que se
                // reintente la carga, la otra que se revise el plan de cuentas.
                message={failed ? 'No se pudo cargar' : 'Sin cuentas en esta sección'}
                description={
                  failed
                    ? 'Reintentá la carga para ver el balance.'
                    : 'Aparecen en cuanto tengan saldo o se activen en el plan de cuentas.'
                }
              />
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Las dos filas calculadas no tienen `accountId`: se distinguen por su nombre,
// que el backend fija (una sola de cada una por sección).
const rowKey = (line: BalanceSheetLine): string => line.accountId ?? line.name;

function BalanceRow({ line }: { line: BalanceSheetLine }) {
  const hint = lineHint(line);
  return (
    <TableRow className={cn('hover:bg-transparent', line.isSubtotal && 'bg-muted/40')}>
      <TableCell className="text-muted-foreground tabular-nums">{line.code ?? '—'}</TableCell>
      <TableCell>
        <span
          className="block min-w-0 break-words"
          style={{ paddingLeft: `${line.depth * INDENT_REM}rem` }}
        >
          <span
            className={cn(
              line.isSubtotal && 'font-semibold',
              line.computed && 'text-muted-foreground italic',
            )}
          >
            {line.name}
          </span>
          {hint && <span className="text-muted-foreground block text-xs">{hint}</span>}
        </span>
      </TableCell>
      <TableCell
        className={cn('text-right tabular-nums', line.isSubtotal ? 'font-semibold' : 'font-medium')}
      >
        {formatMoney(line.balance)}
      </TableCell>
    </TableRow>
  );
}

export function FinanceBalanceSheet() {
  const [scope, setScope] = useState<CurrencyScopeValue>(FINANCE_CURRENCIES[0]);
  const [asOf, setAsOf] = useState('');

  const params = useMemo(
    () => ({
      ...currencyScopeParams(scope),
      asOf: asOf ? civilDayEndIso(asOf) : undefined,
    }),
    [scope, asOf],
  );
  const { data: report, isLoading, isError, error, refetch } = useFinanceBalanceSheet(params);
  const currency = report?.currency ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <CurrencyScopeSelect value={scope} onChange={setScope} />
        <DatePicker
          id="bs-asof"
          value={asOf}
          onChange={setAsOf}
          placeholder="Hoy"
          aria-label="Fecha de corte"
          className="w-auto"
        />
        <span className="text-muted-foreground text-sm">
          La foto de lo que hay a esa fecha. Sin fecha = hoy.
        </span>
        <FinanceReportCsvButton report="balance-sheet" params={params} className="ml-auto" />
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error ? error.message : 'No se pudo cargar el balance general.'}
            </span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {report?.consolidation && <ConsolidationBanner consolidation={report.consolidation} />}

      {/* El cuadre es EL resultado del balance, no un detalle: se muestra siempre.
          Un balance que no cuadra y no lo dice es peor que no tener balance
          (criterio 13 del plan). */}
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : report ? (
        report.balanced ? (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3">
              <StatusBadge tone="success" icon={CircleCheckIcon} label="Cuadra" />
              <span className="text-muted-foreground text-sm">
                Activo = Pasivo + Patrimonio: {formatMoney(report.totals.assets)} ={' '}
                {formatMoney(report.totals.liabilities)} + {formatMoney(report.totals.equity)}{' '}
                {currency}.
              </span>
            </CardContent>
          </Card>
        ) : (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>
              No cuadra: {formatMoney(report.difference)} {currency} entre el activo y el pasivo más
              el patrimonio (Activo = Pasivo + Patrimonio). Revisá el mayor: hay líneas que no salieron
              de un asiento.
            </AlertDescription>
          </Alert>
        )
      ) : null}

      {/* Tres cards apiladas a ancho completo, en el orden del balance: Activos
          → Pasivos → Patrimonio. El bento de dos columnas partía el ancho
          disponible al medio y dejaba las tablas más angostas que su contenido;
          a ancho completo, la sangría de la rama y los importes entran sin
          comprimir nada. El cuadre queda arriba, que es lo que se lee primero. */}
      <div className="space-y-6">
        <BalanceSection
          title="Activos"
          section={report?.assets}
          currency={currency}
          loading={isLoading}
          failed={isError}
        />
        <BalanceSection
          title="Pasivos"
          section={report?.liabilities}
          currency={currency}
          loading={isLoading}
          failed={isError}
        />
        <BalanceSection
          title="Patrimonio"
          section={report?.equity}
          currency={currency}
          loading={isLoading}
          failed={isError}
        />
      </div>
    </div>
  );
}
