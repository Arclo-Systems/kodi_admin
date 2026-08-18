'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Skeleton } from '@/components/ui/skeleton';
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
import { EmptyState } from '@/components/admin/empty-state';
import { COUNTRIES } from '@/lib/countries';
import { toYMD } from '@/components/ui/date-picker';
import { useCareerOffersReport } from '@/hooks/use-career-offers';
import { ctrLabel, lastDays } from './career-offers-report-model';

const ALL = '__all__';

export function CareerOffersReportView() {
  const [range, setRange] = useState(() => lastDays(30, new Date()));
  const [country, setCountry] = useState<string>(ALL);

  const query = useMemo(
    () => ({
      from: new Date(`${range.from}T00:00:00`).toISOString(),
      to: new Date(`${range.to}T23:59:59.999`).toISOString(),
      ...(country === ALL ? {} : { country }),
    }),
    [range, country],
  );
  const { data, isLoading, isError } = useCareerOffersReport(query);

  const totals = (data?.items ?? []).reduce(
    (acc, row) => ({
      sheetOpens: acc.sheetOpens + row.sheetOpens,
      linkClicks: acc.linkClicks + row.linkClicks,
    }),
    { sheetOpens: 0, linkClicks: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker
          from={range.from}
          to={range.to}
          aria-label="Período del reporte"
          className="w-64"
          onChange={(from, to) => {
            // El rango a medio elegir (solo `from`) dejaría la query sin `to`: se
            // aplica cuando están las dos puntas.
            if (from && to) setRange({ from, to });
          }}
        />
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-44" aria-label="Filtrar por país">
            <SelectValue placeholder="País" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los países</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} · {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">
          {totals.sheetOpens} aperturas · {totals.linkClicks} clics
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <p className="text-destructive text-sm">No se pudo cargar el reporte.</p>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          message="Sin eventos en el período"
          description="La app registra una apertura cuando el estudiante abre la ficha y un clic cuando toca «Ir al sitio»."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Universidad</TableHead>
                <TableHead className="text-right">Aperturas</TableHead>
                <TableHead className="text-right">Clics</TableHead>
                <TableHead className="text-right">CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((row) => (
                <TableRow key={row.universityId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{row.universityCode}</Badge>
                      <span className="font-medium">{row.universityName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.sheetOpens}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.linkClicks}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ctrLabel(row.sheetOpens, row.linkClicks)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Período: {range.from} → {range.to} (hoy: {toYMD(new Date())}).
      </p>
    </div>
  );
}
