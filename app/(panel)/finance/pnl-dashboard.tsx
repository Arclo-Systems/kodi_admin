'use client';

import { useState } from 'react';
import {
  BarChart3Icon,
  LayersIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useFinancePnl } from '@/hooks/use-finance';

const chartConfig = {
  income: { label: 'Ingresos', color: 'var(--chart-2)' },
  expense: { label: 'Gastos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const fmt = (n: number) => n.toLocaleString('es-CR', { minimumFractionDigits: 2 });
const monthLabel = (m: string) => `${m.slice(5)}/${m.slice(2, 4)}`; // 'YYYY-MM' → 'MM/YY'

export function PnlDashboard() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState('');
  const { data: pnl, isLoading, isError } = useFinancePnl(from || undefined, to || undefined);

  const currencies = pnl?.byCurrency.map((c) => c.currency) ?? [];
  const currency = currencies.includes(selected) ? selected : (currencies[0] ?? '');
  const totals = pnl?.byCurrency.find((c) => c.currency === currency);
  const months = (pnl?.byMonth ?? [])
    .filter((m) => m.currency === currency)
    .map((m) => ({ label: monthLabel(m.month), income: m.income, expense: m.expense }));
  const expenseCats = (pnl?.byCategory ?? []).filter(
    (c) => c.currency === currency && c.kind === 'expense',
  );

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
        <span className="text-muted-foreground text-sm">
          Sin fechas = últimos 12 meses.
        </span>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>No se pudo cargar el P&amp;L.</AlertDescription>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label={`Ingresos (${currency})`}
              value={fmt(totals?.income ?? 0)}
              loading={isLoading}
              tone="green"
              icon={<TrendingUpIcon />}
            />
            <KpiCard
              label={`Gastos (${currency})`}
              value={fmt(totals?.expense ?? 0)}
              loading={isLoading}
              tone="amber"
              icon={<TrendingDownIcon />}
            />
            <KpiCard
              label={`Neto (${currency})`}
              value={fmt(totals?.net ?? 0)}
              loading={isLoading}
              tone={(totals?.net ?? 0) >= 0 ? 'teal' : 'red'}
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
                Gastos por categoría ({currency})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenseCats.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin gastos en el rango.</p>
              ) : (
                <dl className="[&>div:last-child]:border-b-0">
                  {expenseCats.map((c) => (
                    <div
                      key={c.categoryName}
                      className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5"
                    >
                      <dt className="text-sm">{c.categoryName}</dt>
                      <dd className="text-sm font-semibold tabular-nums">{fmt(c.total)}</dd>
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
