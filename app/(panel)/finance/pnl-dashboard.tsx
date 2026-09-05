'use client';

import { useState } from 'react';
import {
  BarChart3Icon,
  DownloadIcon,
  LayersIcon,
  ReceiptIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { KpiCard } from '@/components/admin/kpi-card';
import { financeReportCsvHref, useFinancePnl } from '@/hooks/use-finance';
import { civilDayEndIso, civilDayStartIso } from '@/lib/civil-date';
import { ACCOUNT_TYPE_LABELS, formatMoney } from './finance-format';

const chartConfig = {
  income: { label: 'Ingresos', color: 'var(--chart-2)' },
  expense: { label: 'Gastos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const monthLabel = (m: string) => `${m.slice(5)}/${m.slice(2, 4)}`; // 'YYYY-MM' → 'MM/YY'

export function PnlDashboard() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState('');
  const range = {
    from: from ? civilDayStartIso(from) : undefined,
    to: to ? civilDayEndIso(to) : undefined,
  };
  const { data: pnl, isLoading, isError } = useFinancePnl(range.from, range.to);

  const currencies = pnl?.byCurrency.map((c) => c.currency) ?? [];
  const currency = currencies.includes(selected) ? selected : (currencies[0] ?? '');
  const totals = pnl?.byCurrency.find((c) => c.currency === currency);
  // Recharts dibuja píxeles y necesita números: es el único punto donde el importe
  // deja de ser string, y no vuelve de ahí (los rótulos salen del string original).
  const months = (pnl?.byMonth ?? [])
    .filter((m) => m.currency === currency)
    .map((m) => ({ label: monthLabel(m.month), income: Number(m.income), expense: Number(m.expense) }));
  const accounts = (pnl?.byAccount ?? []).filter((a) => a.currency === currency);
  const net = totals?.net ?? '0.00';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
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
        {currencies.length > 1 && (
          <Select value={currency} onValueChange={setSelected}>
            <SelectTrigger className="w-32" size="sm" aria-label="Moneda">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="text-muted-foreground text-sm">Sin fechas = últimos 12 meses.</span>
        {/* La descarga la hace el browser contra el BFF: un fetch tendría que
            rearmar el archivo en memoria y perdería el nombre del backend. */}
        <Button variant="outline" size="sm" className="ml-auto" asChild>
          <a href={financeReportCsvHref('pnl', range)} download>
            <DownloadIcon className="size-4" />
            Exportar CSV
          </a>
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>No se pudo cargar el estado de resultados.</AlertDescription>
        </Alert>
      )}

      {!isLoading && currencies.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-14 text-center text-sm">
            Sin movimientos en el rango. Cargá gastos/ingresos o ajustá las fechas.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={`Ingresos (${currency})`}
              value={formatMoney(totals?.income ?? '0.00')}
              loading={isLoading}
              tone="green"
              icon={<TrendingUpIcon />}
            />
            <KpiCard
              label={`Costo de ingresos (${currency})`}
              value={formatMoney(totals?.costOfRevenue ?? '0.00')}
              loading={isLoading}
              tone="blue"
              icon={<ReceiptIcon />}
            />
            <KpiCard
              label={`Gastos operativos (${currency})`}
              value={formatMoney(totals?.operatingExpense ?? '0.00')}
              loading={isLoading}
              tone="amber"
              icon={<TrendingDownIcon />}
            />
            <KpiCard
              label={`Neto (${currency})`}
              value={formatMoney(net)}
              loading={isLoading}
              tone={net.startsWith('-') ? 'red' : 'teal'}
              icon={<WalletIcon />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3Icon className="text-primary size-4" />
                Ingresos vs gastos por mes ({currency})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="bg-muted h-56 w-full animate-pulse rounded" />
              ) : months.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin datos en el rango.</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-56 w-full">
                  <BarChart data={months}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis width={48} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                    <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayersIcon className="text-primary size-4" />
                Desglose por cuenta ({currency})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin movimientos en el rango.</p>
              ) : (
                <dl className="[&>div:last-child]:border-b-0">
                  {accounts.map((a) => (
                    <div
                      key={`${a.currency}-${a.accountCode}`}
                      className="border-border/60 flex items-center justify-between gap-4 border-b py-2.5"
                    >
                      <dt className="min-w-0 text-sm">
                        <span className="text-muted-foreground mr-2 tabular-nums">
                          {a.accountCode}
                        </span>
                        {a.accountName}
                        <span className="text-muted-foreground ml-2 text-xs">
                          {ACCOUNT_TYPE_LABELS[a.type]}
                        </span>
                      </dt>
                      <dd className="text-sm font-semibold tabular-nums">
                        {formatMoney(a.amount)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
