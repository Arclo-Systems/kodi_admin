'use client';

import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-react';
import { useJobSchedules } from '@/hooks/use-jobs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Fecha corta y local: la tabla se lee de un vistazo, no se audita al segundo.
const fmt = (ms: number | null): string =>
  ms == null
    ? '—'
    : new Date(ms).toLocaleString('es-CR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

export function JobsSchedules() {
  const { data, isLoading, isError, error } = useJobSchedules();

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (isError) {
    return (
      <p className="text-destructive text-sm">
        {(error as Error)?.message ?? 'No se pudo cargar lo programado.'}
      </p>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay tareas programadas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarea</TableHead>
            <TableHead>Cuándo corre</TableHead>
            <TableHead>Próxima</TableHead>
            {/* "—" significa que no está en la ventana reciente de la cola, no
                que la tarea nunca haya corrido. */}
            <TableHead>Última que se ve</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s) => (
            <TableRow key={s.name}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>
                <span>{s.description}</span>
                {/* El cron es el dato exacto, pero en segundo plano: quien lo
                    necesita lo busca, quien no lee la descripción. */}
                <code className="text-muted-foreground ml-2 text-xs">
                  {s.pattern}
                </code>
              </TableCell>
              <TableCell className="tabular-nums">{fmt(s.nextRunAt)}</TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  {s.lastRunFailed === null ? null : s.lastRunFailed ? (
                    <AlertCircleIcon className="text-destructive size-4" />
                  ) : (
                    <CheckCircle2Icon className="text-success size-4" />
                  )}
                  <span className="tabular-nums">{fmt(s.lastRunAt)}</span>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
