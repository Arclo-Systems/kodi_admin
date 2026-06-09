'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { useCutoffs, type CutoffStatus, type CutoffUpload } from '@/hooks/use-cutoffs';
import { DataTable } from '@/components/admin/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CutoffStatusBadge } from '@/lib/cutoff-status';
import { CutoffsUploadDialog } from './cutoffs-upload-dialog';

const ALL = '__all__';

const columns: ColumnDef<CutoffUpload, unknown>[] = [
  {
    id: 'module',
    header: 'Módulo',
    meta: { label: 'Módulo' },
    cell: ({ row }) => row.original.module?.shortName ?? '—',
  },
  { accessorKey: 'country', header: 'País', meta: { label: 'País' } },
  { accessorKey: 'year', header: 'Año', meta: { label: 'Año' } },
  {
    accessorKey: 'status',
    header: 'Estado',
    meta: { label: 'Estado' },
    cell: ({ row }) => <CutoffStatusBadge status={row.original.status} />,
  },
  {
    id: 'diff',
    header: 'Diff',
    meta: { label: 'Diff' },
    cell: ({ row }) => {
      const d = row.original.diffSummary;
      return (
        <span className="text-xs tabular-nums">
          <span className="text-success">+{d.toInsert}</span>{' '}
          <span className="text-destructive">−{d.toDelete}</span>
          {d.invalid > 0 && <span className="text-warning"> · {d.invalid} inv.</span>}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Subida',
    meta: { label: 'Subida' },
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('es'),
  },
];

export function CutoffsTable() {
  const router = useRouter();
  const [status, setStatus] = useState<CutoffStatus | undefined>(undefined);
  const { data, isLoading } = useCutoffs(status);
  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          value={status ?? ALL}
          onValueChange={(v) => setStatus(v === ALL ? undefined : (v as CutoffStatus))}
        >
          <SelectTrigger className="w-44" aria-label="Filtrar por estado">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            <SelectItem value="pending_review">Pendiente</SelectItem>
            <SelectItem value="applied">Aplicada</SelectItem>
            <SelectItem value="rejected">Rechazada</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          {/* Slot donde el DataTable porta "Columnas" para compartir esta línea. */}
          <div id="cutoffs-table-toolbar" className="flex items-center gap-2" />
          <CutoffsUploadDialog />
        </div>
      </div>
      <DataTable
        columns={columns}
        data={items}
        total={items.length}
        page={1}
        pageSize={Math.max(items.length, 1)}
        loading={isLoading}
        onPageChange={() => {}}
        onRowClick={(c) => router.push(`/content/admission-cutoffs/${c.id}`)}
        toolbarPortalId="cutoffs-table-toolbar"
        emptyMessage="No hay subidas de cortes"
      />
    </div>
  );
}
