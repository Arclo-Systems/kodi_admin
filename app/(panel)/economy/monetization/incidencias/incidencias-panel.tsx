'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TableEmptyRow } from '@/components/admin/empty-state';
import { DataTablePagination } from '@/components/admin/data-table-pagination';
import {
  INCIDENT_STATUSES,
  useIncidents,
  useStoreMutations,
  type IncidentStatus,
  type Incidents,
} from '@/hooks/use-store-monetization';
import { EventStatusBadge, PayloadDialog, ReasonAction, dateTime } from '../store-shared';
import { AssignModulesDialog } from './assign-modules-dialog';

/**
 * Los cinco tipos de incidencia de spec §10. Los cuatro primeros son estados
 * terminales de un evento; el quinto no es un evento sino un saldo — el clawback
 * de un consumible reembolsado descuenta aunque el saldo no alcance, y ese
 * negativo es la incidencia.
 *
 * El `why` va en tooltip y no en la card: son cinco párrafos que se leen una vez y
 * después estorban el escaneo, que es para lo que existe un contador.
 */
const INCIDENT_LABEL: Record<string, { title: string; why: string }> = {
  unmapped: {
    title: 'SKU sin mapear',
    why: 'Play cobró un producto que no está en la allowlist. No se concedió nada.',
  },
  unresolved: {
    title: 'Sin dueño',
    why: 'No se pudo saber de quién es la compra. Nadie recibió acceso.',
  },
  pending_module_selection: {
    title: 'Faltan módulos',
    why: 'Se sabe de quién es la compra, falta que el usuario elija qué módulos cubre.',
  },
  founder_without_reservation: {
    title: 'Fundador sin cupo',
    why: 'Se pagó un plan fundador desde la ficha de Play. El acceso se concedió; el cupo no bajó.',
  },
  kokos_negativo: {
    title: 'Kokos en negativo',
    why: 'Un reembolso descontó Kokos ya gastados. El saldo quedó negativo a propósito.',
  },
};

const ORDER = [...INCIDENT_STATUSES, 'kokos_negativo'] as const;

// El saldo negativo no es un evento paginable: el backend trae los 100 más rojos.
const KOKOS_LIMIT = 100;

export type IncidenciasPanelProps = {
  data: Incidents;
  status?: IncidentStatus;
  onStatusChange?: (status: IncidentStatus | undefined) => void;
  page?: number;
  onPageChange?: (page: number) => void;
};

export function IncidenciasPanel({
  data,
  status,
  onStatusChange,
  page,
  onPageChange,
}: IncidenciasPanelProps) {
  const { resolveIncident } = useStoreMutations();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ORDER.map((key) => {
          const filtrable = key !== 'kokos_negativo';
          const activo = status === key;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={!filtrable}
                  aria-pressed={activo}
                  onClick={() =>
                    onStatusChange?.(activo ? undefined : (key as IncidentStatus))
                  }
                  className={cn(
                    'focus-visible:ring-ring rounded-xl text-left focus-visible:ring-2 focus-visible:outline-none',
                    filtrable && 'cursor-pointer',
                  )}
                >
                  <Card
                    className={cn(
                      'h-full transition-colors',
                      filtrable && 'hover:border-primary/40',
                      activo && 'border-primary',
                    )}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        {INCIDENT_LABEL[key]?.title}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">{key}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-2xl font-semibold tabular-nums">
                        {data.counts[key] ?? 0}
                      </span>
                    </CardContent>
                  </Card>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{INCIDENT_LABEL[key]?.why}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Recibido</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableEmptyRow
                  colSpan={5}
                  message="Sin incidencias abiertas"
                  description="Todas las compras se resolvieron solas."
                />
              ) : (
                data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.eventType}</TableCell>
                    <TableCell>
                      <EventStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {dateTime(row.receivedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate text-xs">
                      {row.lastError ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <PayloadDialog payload={row.payload} />
                        {row.status === 'pending_module_selection' && (
                          <AssignModulesDialog eventId={row.id} />
                        )}
                        <ReasonAction
                          label="Marcar resuelto"
                          title="Cerrar la incidencia"
                          description={
                            row.status === 'pending_module_selection'
                              ? 'No concede ni revoca nada, y no tiene vuelta atrás: una vez cerrada, el panel ya no puede asignarle módulos. El usuario sí puede seguir eligiéndolos desde la app.'
                              : 'No concede ni revoca nada: solo saca la fila del listado. Usalo cuando la compra ya se arregló por otro lado.'
                          }
                          onConfirm={(reason) =>
                            resolveIncident.mutateAsync({ id: row.id, reason })
                          }
                          successMessage={() => 'Incidencia cerrada'}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {page !== undefined && onPageChange && (
        <DataTablePagination
          page={page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={onPageChange}
        />
      )}

      {data.negativeKokos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saldos de Kokos en negativo</CardTitle>
            <CardDescription>
              Reembolsos cuyo descuento no alcanzó el saldo. Queda en rojo a propósito: absorberlo en
              silencio sería regalar el fraude.{' '}
              {data.negativeKokosTotal > data.negativeKokos.length &&
                `Se muestran los ${KOKOS_LIMIT} más negativos de ${data.negativeKokosTotal}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.negativeKokos.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.displayName}</div>
                      <div className="text-muted-foreground text-xs">{row.email}</div>
                    </TableCell>
                    <TableCell>{row.country ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="tabular-nums">
                        {row.kokosBalance}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function IncidenciasView() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<IncidentStatus | undefined>();
  const { data, isLoading, error } = useIncidents({ status, page });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }
  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;

  return (
    <IncidenciasPanel
      data={data}
      status={status}
      onStatusChange={(next) => {
        setStatus(next);
        setPage(1);
      }}
      page={page}
      onPageChange={setPage}
    />
  );
}
