'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { CircleCheckIcon, CircleDashedIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/lib/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/data-table';
import {
  useVocItems,
  useVocItemMutations,
  RIASEC_DIMENSIONS,
  DIMENSION_LABELS,
  type VocDimension,
  type VocItem,
} from '@/hooks/use-vocational-items';
import { VocItemDialog } from './voc-item-dialog';

const ALL = '__all__';

export function VocItemsTable() {
  const [dimension, setDimension] = useState<string>(ALL);
  const [active, setActive] = useState<string>(ALL);
  const { data, isLoading, isError } = useVocItems({
    dimension: dimension === ALL ? undefined : (dimension as VocDimension),
    isActive: active === ALL ? undefined : active === 'true',
    page: 1,
    pageSize: 200,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VocItem | null>(null);

  const items = [...(data?.items ?? [])].sort((a, b) => a.order - b.order);
  const nextOrder = items.reduce((max, i) => Math.max(max, i.order), -1) + 1;

  function openCreate(): void {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(item: VocItem): void {
    setEditing(item);
    setFormOpen(true);
  }

  const columns: ColumnDef<VocItem, unknown>[] = [
    {
      accessorKey: 'order',
      header: 'Orden',
      meta: { label: 'Orden' },
      cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.order}</span>,
    },
    {
      accessorKey: 'text',
      header: 'Enunciado',
      meta: { label: 'Enunciado' },
      cell: ({ row }) => <span className="font-medium">{row.original.text}</span>,
    },
    {
      accessorKey: 'dimension',
      header: 'Dimensión',
      meta: { label: 'Dimensión' },
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.dimension} — {DIMENSION_LABELS[row.original.dimension]}
        </Badge>
      ),
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
        <VocItemRowActions item={row.original} onEdit={() => openEdit(row.original)} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        toolbar={
          <>
            <Select value={dimension} onValueChange={setDimension}>
              <SelectTrigger className="w-52" size="sm" aria-label="Filtrar por dimensión">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las dimensiones</SelectItem>
                {RIASEC_DIMENSIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d} — {DIMENSION_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={active} onValueChange={setActive}>
              <SelectTrigger className="w-32" size="sm" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="ml-auto" onClick={openCreate}>
              <PlusIcon className="size-4" /> Nuevo ítem
            </Button>
          </>
        }
        columns={columns}
        data={items}
        total={items.length}
        page={1}
        pageSize={Math.max(items.length, 1)}
        loading={isLoading}
        onPageChange={() => {}}
        emptyMessage={isError ? 'No se pudieron cargar los ítems.' : 'Sin ítems con esos filtros.'}
      />

      {formOpen && (
        <VocItemDialog item={editing} nextOrder={nextOrder} open onOpenChange={setFormOpen} />
      )}
    </div>
  );
}

// Acciones de fila: Editar (ghost neutro) · Eliminar (ghost + text-destructive, borrado real con confirm).
function VocItemRowActions({ item, onEdit }: { item: VocItem; onEdit: () => void }) {
  const { remove } = useVocItemMutations();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <PencilIcon className="size-4" /> Editar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2Icon className="size-4" /> Eliminar
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar ítem"
        description="Se borra permanentemente este ítem del test vocacional. No afecta los resultados ya calculados."
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          await remove.mutateAsync(item.id);
          toast.success('Ítem eliminado');
        }}
      />
    </div>
  );
}
