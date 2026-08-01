'use client';

import { useNotificationsCatalog } from '@/hooks/use-notifications-catalog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function NotificationsCatalog() {
  const { data, isLoading, isError, error } = useNotificationsCatalog();

  if (isLoading) return <Skeleton className="h-72 w-full" />;

  if (isError) {
    return (
      <p className="text-destructive text-sm">
        {(error as Error)?.message ?? 'No se pudo cargar el catálogo.'}
      </p>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay notificaciones configuradas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Notificación</TableHead>
            <TableHead>Cuándo le llega</TableHead>
            <TableHead>La puede apagar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((n) => (
            <TableRow key={n.type}>
              <TableCell>
                <span className="font-medium">{n.label}</span>
                <code className="text-muted-foreground ml-2 text-xs">
                  {n.type}
                </code>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {n.trigger}
              </TableCell>
              <TableCell>
                {n.settingKey ? (
                  <code className="text-xs">{n.settingKey}</code>
                ) : (
                  <Badge variant="secondary">Siempre se envía</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
