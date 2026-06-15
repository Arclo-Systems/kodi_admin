import { type ReactNode } from 'react';
import { InboxIcon } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type EmptyStateProps = {
  message?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
};

// Estado vacío estándar: icono en círculo + mensaje (+ descripción opcional). Reutilizado por
// DataTable y por las tablas armadas a mano, para un empty-state consistente en todo el panel.
export function EmptyState({
  message = 'No hay resultados',
  description,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-12 text-center', className)}>
      <div
        aria-hidden
        className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full [&_svg]:size-6"
      >
        {icon ?? <InboxIcon />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{message}</p>
        {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      </div>
    </div>
  );
}

// Fila de tabla que ocupa todas las columnas con el EmptyState centrado. Para tablas a mano
// (`<Table>` crudo) que pueden quedar sin filas.
export function TableEmptyRow({ colSpan, ...props }: { colSpan: number } & EmptyStateProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan}>
        <EmptyState {...props} />
      </TableCell>
    </TableRow>
  );
}
