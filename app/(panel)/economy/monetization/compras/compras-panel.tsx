'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useStoreEvents, useStoreMutations } from '@/hooks/use-store-monetization';
import {
  EventStatusBadge,
  PayloadDialog,
  ReasonAction,
  dateTime,
  eventStatusLabel,
  latency,
} from '../store-shared';

const ALL = 'ALL';
const STATUSES = [
  'received',
  'processed',
  'failed',
  'unmapped',
  'unresolved',
  'pending_module_selection',
  'founder_without_reservation',
];
const WINDOWS = [7, 14, 30, 90];

export function ComprasPanel() {
  const [status, setStatus] = useState(ALL);
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useStoreEvents({
    status: status === ALL ? undefined : status,
    days,
    page,
  });
  const { reprocessEvent } = useStoreMutations();
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
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {eventStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(days)}
          onValueChange={(value) => {
            setDays(Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOWS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                Últimos {d} días
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Recibido</TableHead>
                  <TableHead>Latencia</TableHead>
                  <TableHead>Intentos</TableHead>
                  <TableHead>Recibo (sha)</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableEmptyRow
                    colSpan={7}
                    message="Sin eventos"
                    description="Play no mandó ninguna notificación en esta ventana."
                  />
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.eventType}</TableCell>
                      <TableCell>
                        <EventStatusBadge status={row.status} />
                        {row.lastError && (
                          <div className="text-muted-foreground mt-1 max-w-xs truncate text-xs">
                            {row.lastError}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dateTime(row.receivedAt)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {latency(row.latencyMs)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{row.attempts}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {row.purchaseTokenSha?.slice(0, 12) ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <PayloadDialog payload={row.payload} />
                          <ReasonAction
                            label="Reprocesar"
                            title="Reprocesar el evento"
                            description="Vuelve a correr el mismo pipeline del webhook sobre esta notificación. Solo funciona si la compra ya dejó filas: el recibo no se guarda, y sin él no hay nada que consultarle a la tienda."
                            disabled={row.status === 'received'}
                            onConfirm={(reason) =>
                              reprocessEvent.mutateAsync({ id: row.id, reason })
                            }
                            successMessage={(result) =>
                              `Reprocesado · ahora está en "${eventStatusLabel(result?.status ?? '')}"`
                            }
                          />
                        </div>
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
