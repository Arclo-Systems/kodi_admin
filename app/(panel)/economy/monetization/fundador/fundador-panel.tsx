'use client';

import { useState } from 'react';
import { BadgeCheckIcon, BookmarkIcon, CrownIcon, TicketIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { KpiCard } from '@/components/admin/kpi-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { COUNTRIES } from '@/lib/countries';
import { useFounderOffer, type FounderOffer } from '@/hooks/use-store-monetization';

const chartConfig = {
  claimed: { label: 'Entregados', color: 'var(--chart-1)' },
  released: { label: 'Devueltos', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const fmt = (n: number): string => n.toLocaleString('es-CR');

// El backend SIEMPRE manda `slotsAvailable`, `timeline`, `label`, `slug` e `isActive`; se
// aflojan a opcionales para poder montar la tarjeta con los cuatro contadores en un test sin
// inventar una serie temporal. La resta de fallback existe por eso, no porque haga falta en prod.
export type FounderCounters = Pick<
  FounderOffer,
  'slotsTotal' | 'slotsClaimed' | 'slotsReserved' | 'activeFounders'
> &
  Partial<Pick<FounderOffer, 'slotsAvailable' | 'timeline' | 'label' | 'slug' | 'isActive'>>;

/**
 * Los dos contadores de fundador van SEPARADOS y rotulados (spec §7.6): un
 * reembolso revoca el estatus pero no devuelve el lugar, así que "lugares
 * entregados" incluye reembolsados y no es un conteo de suscriptores. Fusionarlos
 * convertiría el panel en un reporte de MRR que sobrestima.
 */
export function FundadorPanel({ data }: { data: FounderCounters }) {
  const available = data.slotsAvailable ?? Math.max(data.slotsTotal - data.slotsClaimed - data.slotsReserved, 0);

  return (
    <div className="space-y-6">
      {data.label && (
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{data.label}</h2>
          {data.slug && (
            <span className="text-muted-foreground font-mono text-xs">{data.slug}</span>
          )}
          <Badge variant={data.isActive === false ? 'outline' : 'secondary'}>
            {data.isActive === false ? 'Inactiva' : 'Activa'}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Lugares entregados"
          value={fmt(data.slotsClaimed)}
          tone="amber"
          icon={<TicketIcon />}
        />
        <KpiCard
          label="Fundadores vigentes"
          value={fmt(data.activeFounders)}
          tone="green"
          icon={<CrownIcon />}
        />
        <KpiCard
          label="Lugares apartados"
          value={fmt(data.slotsReserved)}
          tone="blue"
          icon={<BookmarkIcon />}
        />
        <KpiCard
          label="Disponibles"
          value={fmt(available)}
          tone="teal"
          icon={<BadgeCheckIcon />}
        />
      </div>

      <Alert>
        <AlertDescription>
          <strong>Lugares entregados (incluye reembolsados)</strong>: el contador mide cuántos
          lugares se dieron, no cuántos siguen vigentes — un reembolso revoca el estatus pero no
          devuelve el lugar. Para suscriptores usá <strong>fundadores vigentes</strong>. Total de la
          oferta: {fmt(data.slotsTotal)}.
        </AlertDescription>
      </Alert>

      {data.timeline && data.timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movimiento de cupos</CardTitle>
            <CardDescription>
              Lugares entregados (primer cobro) y devueltos al pool (trial caído) por día, en los
              últimos {data.timeline.length} días.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <BarChart data={data.timeline}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="claimed" fill="var(--color-claimed)" radius={2} />
                <Bar dataKey="released" fill="var(--color-released)" radius={2} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function FundadorView({ allowedCountries }: { allowedCountries: string[] }) {
  const [country, setCountry] = useState(allowedCountries[0] ?? '');
  const { data, isLoading, error } = useFounderOffer(country);

  return (
    <div className="space-y-6">
      <Select value={country} onValueChange={setCountry}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="País" />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.filter((c) => allowedCountries.includes(c.code)).map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.code} · {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}
      {data && <FundadorPanel data={data} />}
    </div>
  );
}
