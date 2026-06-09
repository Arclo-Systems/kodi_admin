'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuditLog, type AuditLogEntry, type AuditLogQuery } from '@/hooks/use-audit-log';
import { DataTable } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const columns: ColumnDef<AuditLogEntry, unknown>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Fecha',
    meta: { label: 'Fecha' },
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString('es'),
  },
  {
    id: 'actor',
    header: 'Actor',
    meta: { label: 'Actor' },
    cell: ({ row }) => row.original.actor?.email ?? row.original.actorId.slice(0, 8),
  },
  {
    accessorKey: 'action',
    header: 'Acción',
    meta: { label: 'Acción' },
    cell: ({ row }) => <Badge variant="secondary">{row.original.action}</Badge>,
  },
  {
    id: 'resource',
    header: 'Recurso',
    meta: { label: 'Recurso' },
    cell: ({ row }) =>
      row.original.resourceId
        ? `${row.original.resourceType}:${row.original.resourceId.slice(0, 8)}…`
        : row.original.resourceType,
  },
  { accessorKey: 'reason', header: 'Motivo', meta: { label: 'Motivo' } },
];

export function AuditLogTable() {
  const [query, setQuery] = useState<AuditLogQuery>({ page: 1, pageSize: 50 });
  const { data, isLoading } = useAuditLog(query);

  return (
    <DataTable
      toolbar={
        <>
          <Input
            placeholder="Buscar en motivos…"
            value={query.search ?? ''}
            onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })}
            className="h-8 max-w-sm"
          />
          <Input
            placeholder="Acción (ej. admin.update)"
            value={query.action ?? ''}
            onChange={(e) => setQuery({ ...query, action: e.target.value, page: 1 })}
            className="h-8 max-w-xs"
          />
        </>
      }
      columns={columns}
      data={data?.items ?? []}
      total={data?.total ?? 0}
      page={query.page}
      pageSize={query.pageSize}
      loading={isLoading}
      onPageChange={(page) => setQuery({ ...query, page })}
      onPageSizeChange={(pageSize) => setQuery({ ...query, page: 1, pageSize })}
    />
  );
}
