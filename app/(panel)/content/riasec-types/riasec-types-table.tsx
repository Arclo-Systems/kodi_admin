'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleCheckIcon, CircleDashedIcon, PencilIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/lib/status-badge';
import { DataTable } from '@/components/admin/data-table';
import { useRiasecTypes, DIMENSION_LABELS, type RiasecType } from '@/hooks/use-riasec-types';
import { RiasecTypeDialog } from './riasec-type-dialog';

export function RiasecTypesTable() {
  const { data, isLoading, isError } = useRiasecTypes();
  const [editing, setEditing] = useState<RiasecType | null>(null);

  const types = data ?? [];

  const columns: ColumnDef<RiasecType, unknown>[] = [
    {
      accessorKey: 'dimension',
      header: 'Tipo',
      meta: { label: 'Tipo' },
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.dimension} — {DIMENSION_LABELS[row.original.dimension]}
        </Badge>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Título',
      meta: { label: 'Título' },
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      meta: { label: 'Estado' },
      cell: ({ row }) =>
        row.original.isActive ? (
          <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
        ) : (
          <StatusBadge tone="muted" icon={CircleDashedIcon} label="Inactivo" />
        ),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setEditing(row.original)}>
            <PencilIcon className="size-4" /> Editar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={types}
        total={types.length}
        page={1}
        pageSize={Math.max(types.length, 1)}
        loading={isLoading}
        onPageChange={() => {}}
        emptyMessage={isError ? 'No se pudieron cargar los tipos.' : 'Sin tipos.'}
      />

      {editing && (
        <RiasecTypeDialog type={editing} open onOpenChange={(o) => !o && setEditing(null)} />
      )}
    </div>
  );
}
