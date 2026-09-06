'use client';

import { useState } from 'react';
import { InfoIcon, TrendingUpIcon } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { FINANCE_CURRENCIES } from '@/hooks/use-finance';
import {
  FORECAST_HORIZONS,
  useForecast,
  type Forecast,
  type ForecastHorizon,
  type SeriesFit,
} from '@/hooks/use-finance-planning';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney } from './finance-format';
import { FinanceRunway } from './finance-runway';

// Los mismos dos colores que el P&L y el flujo de caja: ingresos donde van los
// ingresos, gastos donde van los gastos. Las series proyectadas comparten color
// con su histórico —son la misma magnitud— y se distinguen por el punteado, no
// por un tercer y cuarto tono que habría que aprender.
const chartConfig = {
  incomeHistory: { label: 'Ingresos', color: 'var(--chart-2)' },
  expenseHistory: { label: 'Gastos', color: 'var(--chart-1)' },
  incomeProjection: { label: 'Ingresos proyectados', color: 'var(--chart-2)' },
  expenseProjection: { label: 'Gastos proyectados', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const monthLabel = (m: string) => `${m.slice(5)}/${m.slice(2, 4)}`; // 'YYYY-MM' → 'MM/YY'

/** `'1.0000'` → `'1,0000'`; sin ajuste, el motivo en vez del número. */
const fitLabel = (fit: SeriesFit): string =>
  fit.r2 === null ? `N/A (${fit.r2Na?.message ?? 'sin ajuste medible'})` : formatMoney(fit.r2);

/**
 * Proyección lineal de ingresos y gastos a 3, 6 o 12 meses.
 *
 * Es una recta de mínimos cuadrados sobre el histórico del mayor, y la pantalla
 * lo dice en letras: el método está a la vista porque un número proyectado que
 * no se distingue de uno medido es peor que no tenerlo. El histórico va sólido y
 * la proyección punteada; la leyenda y el pie lo nombran.
 */
export function FinanceForecast() {
  const [currency, setCurrency] = useState<string>(FINANCE_CURRENCIES[0]);
  const [horizon, setHorizon] = useState<ForecastHorizon>('3');

  const { data: report, isLoading, isError, error, refetch } = useForecast({ currency, horizon });

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
        <Select value={horizon} onValueChange={(v) => setHorizon(v as ForecastHorizon)}>
          <SelectTrigger className="w-40" size="sm" aria-label="Horizonte">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORECAST_HORIZONS.map((h) => (
              <SelectItem key={h} value={h}>
                {h} meses
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm">
          Solo por moneda: convertir una proyección apila dos incertidumbres.
        </span>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error ? error.message : 'No se pudo cargar la proyección.'}
            </span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {report && (
        <Alert>
          <InfoIcon />
          <AlertDescription className="space-y-1">
            <p>
              Proyección lineal sobre {report.basisMonths} meses
              {report.fit && (
                <>
                  {' '}
                  (r² ingresos = {fitLabel(report.fit.income)}, r² gastos ={' '}
                  {fitLabel(report.fit.expense)})
                </>
              )}
              . <strong>No es un dato.</strong>
            </p>
            <p className="text-muted-foreground">{report.label}</p>
          </AlertDescription>
        </Alert>
      )}

      {report?.na && (
        <Alert variant="destructive">
          <AlertDescription>
            Sin proyección: {report.na.message} Se muestra el histórico que hay, sin recta.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="text-primary size-4" />
            Ingresos y gastos por mes ({currency})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="bg-muted h-64 w-full animate-pulse rounded" />
          ) : isError ? (
            <p className="text-muted-foreground text-sm">No se pudo cargar la serie.</p>
          ) : !report || report.history.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay meses con movimiento en {currency}: no hay serie que proyectar.
            </p>
          ) : (
            <>
              <ForecastChart report={report} />
              <p className="text-muted-foreground text-xs">
                Línea sólida: lo que pasó, del libro mayor. Línea punteada: la recta, a partir del
                último mes completo.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {report && report.projection.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meses proyectados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Mes</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.projection.map((point) => (
                  <TableRow key={point.month}>
                    <TableCell className="tabular-nums">{point.month}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <ProjectedAmount amount={point.income} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <ProjectedAmount amount={point.expense} />
                    </TableCell>
                    {/* El neto no se marca: que dé negativo es el resultado
                        normal de una empresa que todavía no factura. */}
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(point.net)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <FinanceRunway currency={currency} />
    </div>
  );
}

/**
 * Un importe proyectado, marcado si la recta lo llevó por debajo de cero.
 *
 * `negativeProjection` del backend es "ingresos **o** gastos proyectados < 0"
 * (`forecast.service.ts:197`), no el neto: unos ingresos negativos son un
 * imposible aritmético que delata que el horizonte es demasiado largo para los
 * datos, mientras que un neto negativo es simplemente perder plata. Por eso el
 * marcador va en la celda de la serie que cayó y no en la fila entera.
 *
 * El número NO se recorta a cero: taparlo escondería exactamente eso.
 */
function ProjectedAmount({ amount }: { amount: string }) {
  return (
    <>
      {formatMoney(amount)}
      {amount.startsWith('-') && (
        <span className="text-warning ml-2 text-xs">proyección imposible: &lt; 0</span>
      )}
    </>
  );
}

function ForecastChart({ report }: { report: Forecast }) {
  const points = [...report.history, ...report.projection];
  const bridge = report.history.at(-1)?.month;

  // Recharts dibuja píxeles y necesita números: es el único punto donde el
  // importe deja de ser string, y no vuelve de ahí. El último mes del histórico
  // entra también en la serie proyectada para que el punteado arranque pegado a
  // lo medido y no flotando.
  const data = points.map((p) => ({
    label: monthLabel(p.month),
    incomeHistory: p.isProjection ? null : Number(p.income),
    expenseHistory: p.isProjection ? null : Number(p.expense),
    incomeProjection: p.isProjection || p.month === bridge ? Number(p.income) : null,
    expenseProjection: p.isProjection || p.month === bridge ? Number(p.expense) : null,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis width={72} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="incomeHistory"
          stroke="var(--color-incomeHistory)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Line
          dataKey="expenseHistory"
          stroke="var(--color-expenseHistory)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        {/* Fuera de la leyenda: son las mismas dos magnitudes, y cuatro entradas
            para dos series obligarían a leerla dos veces. */}
        <Line
          dataKey="incomeProjection"
          stroke="var(--color-incomeProjection)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
          connectNulls={false}
          legendType="none"
        />
        <Line
          dataKey="expenseProjection"
          stroke="var(--color-expenseProjection)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
          connectNulls={false}
          legendType="none"
        />
      </LineChart>
    </ChartContainer>
  );
}
