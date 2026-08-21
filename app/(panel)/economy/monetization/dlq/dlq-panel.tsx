'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
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
import { useDlq, useStoreMutations } from '@/hooks/use-store-monetization';
import { PayloadDialog, ReasonAction, dateTime, eventStatusLabel } from '../store-shared';

export function DlqPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useDlq(page);
  const { retryDlq } = useStoreMutations();
  const rows = data?.items ?? [];

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Lo que se ve acá ya salió de la cola: el drenaje periódico saca cada mensaje descartado y
          lo deja registrado con su motivo. Sin ese paso, la cola sería un cementerio que nadie mira.
        </AlertDescription>
      </Alert>

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
                  <TableHead>Entregas</TableHead>
                  <TableHead>Descartado</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableEmptyRow
                    colSpan={5}
                    message="La cola de descartes está vacía"
                    description="Ninguna notificación de Play murió antes de llegar al pipeline."
                  />
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.eventType}</TableCell>
                      <TableCell className="text-sm tabular-nums">{row.attempts}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dateTime(row.receivedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-sm truncate text-xs">
                        {row.lastError ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <PayloadDialog payload={row.payload} />
                          <ReasonAction
                            label="Reintentar"
                            title="Reintentar el mensaje descartado"
                            description="Corre el pipeline del webhook sobre esta notificación. Necesita que la compra ya tenga filas: el recibo no se guarda."
                            onConfirm={(reason) => retryDlq.mutateAsync({ id: row.id, reason })}
                            successMessage={(result) =>
                              `Reintentado · ahora está en "${eventStatusLabel(result?.status ?? '')}"`
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
