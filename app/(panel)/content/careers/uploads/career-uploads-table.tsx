'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useCareerUploads,
  type CareerUpload,
  type CareerUploadStatus,
} from '@/hooks/use-career-uploads';
import { DataTable } from '@/components/admin/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CutoffStatusBadge } from '@/lib/cutoff-status';
import { CareerUploadDialog } from './career-upload-dialog';

const ALL = '__all__';

const columns: ColumnDef<CareerUpload, unknown>[] = [
  {
    id: 'module',
    header: 'Módulo',
    meta: { label: 'Módulo' },
    cell: ({ row }) => row.original.module?.shortName ?? '—',
  },
  { accessorKey: 'country', header: 'País', meta: { label: 'País' } },
  {
    id: 'diff',
    header: 'Diff',
    meta: { label: 'Diff' },
    cell: ({ row }) => {
      const d = row.original.diffSummary;
      return (
        <span className="text-xs tabular-nums">
          <span className="text-success">+{d.toInsert}</span>{' '}
          <span className="text-info">~{d.toUpdate}</span>
          {d.invalid > 0 && <span className="text-warning"> · {d.invalid} inv.</span>}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    meta: { label: 'Estado' },
    cell: ({ row }) => <CutoffStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Subida',
    meta: { label: 'Subida' },
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('es'),
  },
];

export function CareerUploadsTable() {
  const router = useRouter();
  const [status, setStatus] = useState<CareerUploadStatus | undefined>(undefined);
  const { data, isLoading } = useCareerUploads(status);
  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          value={status ?? ALL}
          onValueChange={(v) => setStatus(v === ALL ? undefined : (v as CareerUploadStatus))}
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
          {/* Slot donde el DataTable porta "Columnas". */}
          <div id="career-uploads-table-toolbar" className="flex items-center gap-2" />
          <CareerUploadDialog />
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
        onRowClick={(c) => router.push(`/content/careers/uploads/${c.id}`)}
        toolbarPortalId="career-uploads-table-toolbar"
        emptyMessage="No hay subidas de carreras"
      />
    </div>
  );
}
