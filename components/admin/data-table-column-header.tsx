'use client';

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import type { Column } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
};

// Header clickeable para columnas ordenables del DataTable. Con manualSorting, el toggle
// dispara onSortingChange → la tabla re-consulta con sortBy/sortDir al backend.
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) return <span className={className}>{title}</span>;

  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-3 h-8', className)}
      onClick={() => column.toggleSorting(sorted === 'asc')}
      aria-label={`Ordenar por ${title}`}
    >
      {title}
      {sorted === 'desc' ? (
        <ArrowDownIcon className="ml-2 size-4" />
      ) : sorted === 'asc' ? (
        <ArrowUpIcon className="ml-2 size-4" />
      ) : (
        <ChevronsUpDownIcon className="ml-2 size-4 opacity-50" />
      )}
    </Button>
  );
}
