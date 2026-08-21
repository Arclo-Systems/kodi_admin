'use client';

import { useState } from 'react';
import { DownloadIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { DataTablePagination } from '@/components/admin/data-table-pagination';
import { COUNTRIES } from '@/lib/countries';
import {
  useReservations,
  useStoreMutations,
  type Reservation,
  type ReservationStatus,
} from '@/hooks/use-store-monetization';
import { ReasonAction, ReservationStatusBadge, dateTime } from '../store-shared';

const ALL = 'ALL';
const STATUSES: ReservationStatus[] = ['reserved', 'consumed', 'released'];

const CSV_HEADERS = [
  'id',
  'oferta',
  'pais',
  'usuario',
  'email',
  'estado',
  'vence',
  'consumido',
  'liberado',
  'intent',
];

function toCsv(rows: Reservation[]): string {
  const body = rows.map((r) =>
    [
      r.id,
      r.offerSlug,
      r.country,
      r.userDisplayName,
      r.userEmail,
      r.status,
      r.expiresAt,
      r.consumedAt ?? '',
      r.releasedAt ?? '',
      r.purchaseIntentId ?? '',
    ]
      // Las comillas dobles se escapan duplicándolas: un displayName con comillas
      // partiría la fila y correría todas las columnas siguientes.
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(','),
  );
  return [CSV_HEADERS.join(','), ...body].join('\n');
}

function downloadCsv(rows: Reservation[]): void {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `reservas-fundador-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReservasPanel({ allowedCountries }: { allowedCountries: string[] }) {
  const [status, setStatus] = useState<string>(ALL);
  const [country, setCountry] = useState<string>(ALL);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useReservations({
    status: status === ALL ? undefined : (status as ReservationStatus),
    country: country === ALL ? undefined : country,
    page,
  });
  const { releaseReservation } = useStoreMutations();
  const rows = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'reserved' ? 'Apartado' : s === 'consumed' ? 'Entregado' : 'Devuelto'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={country}
          onValueChange={(value) => {
            setCountry(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="País" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los países</SelectItem>
            {COUNTRIES.filter((c) => allowedCountries.includes(c.code)).map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} · {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-2"
          disabled={rows.length === 0}
          onClick={() => downloadCsv(rows)}
        >
          <DownloadIcon className="size-3" />
          Exportar CSV
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="m-4 h-40" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Oferta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableEmptyRow
                    colSpan={6}
                    message="Sin reservas"
                    description="Nadie apartó un lugar de fundador con estos filtros."
                  />
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.userDisplayName}</div>
                        <div className="text-muted-foreground text-xs">{row.userEmail}</div>
                      </TableCell>
                      <TableCell>
                        <div>{row.offerSlug}</div>
                        <div className="text-muted-foreground text-xs">{row.country}</div>
                      </TableCell>
                      <TableCell>
                        <ReservationStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dateTime(row.expiresAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {row.purchaseIntentId?.slice(0, 8) ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <ReasonAction
                          label="Liberar"
                          title="Liberar el lugar apartado"
                          description="El cupo vuelve al pool y el usuario deja de tenerlo reservado. Solo aplica a lugares apartados: uno ya entregado no se devuelve ni con reembolso."
                          destructive
                          disabled={row.status !== 'reserved'}
                          onConfirm={(reason) =>
                            releaseReservation.mutateAsync({ id: row.id, reason })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DataTablePagination
        page={page}
        pageSize={data?.pageSize ?? 50}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
