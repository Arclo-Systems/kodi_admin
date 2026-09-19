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
import { formatDateTime } from '@/lib/format-date';

// Fecha corta: la tabla se lee de un vistazo, no se audita al segundo. El año sobra porque
// lo que se mira es la próxima corrida y la última, siempre cerca de hoy.
const CORRIDA: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

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
            <TableHead>Próxima (CR)</TableHead>
            {/* "—" significa que no está en la ventana reciente de la cola, no
                que la tarea nunca haya corrido. */}
            <TableHead>Última que se ve (CR)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s) => (
            <TableRow key={s.name}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>
                <span>{s.description}</span>
                {/* El cron es el dato exacto, pero en segundo plano: quien lo
                    necesita lo busca, quien no lee la descripción. Va rotulado
                    porque el backend lo registra en UTC (`tz: 'UTC'` en
                    `jobs.scheduler.ts`) y sin la etiqueta un `0 6 * * *` se lee
                    como las 6 de la mañana cuando en CR es la medianoche. Las
                    columnas de al lado sí son instantes y van en hora de CR. */}
                <code
                  className="text-muted-foreground ml-2 text-xs"
                  title="Patrón cron en UTC; Costa Rica es UTC−6"
                >
                  {s.pattern} UTC
                </code>
              </TableCell>
              <TableCell className="tabular-nums">{formatDateTime(s.nextRunAt, CORRIDA)}</TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  {s.lastRunFailed === null ? null : s.lastRunFailed ? (
                    <AlertCircleIcon className="text-destructive size-4" />
                  ) : (
                    <CheckCircle2Icon className="text-success size-4" />
                  )}
                  <span className="tabular-nums">{formatDateTime(s.lastRunAt, CORRIDA)}</span>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
