'use client';

import { type ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { EyeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/data-table';
import { useGameList, type GameEntity } from '@/hooks/use-game';

export type GameColumn<Row> = { header: string; cell: (row: Row) => ReactNode };

const ALL = 'all';
const PAGE_SIZE = 20;

export function GameTable<Row extends { id: string; annulledAt: string | null }>({
  entity,
  columns,
  statusOptions,
  action,
}: {
  entity: GameEntity;
  columns: GameColumn<Row>[];
  statusOptions: { value: string; label: string }[];
  action?: ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useGameList<Row>(entity, {
    status: status === ALL ? undefined : status,
    page,
  });

  const open = (id: string) => router.push(`/game/${entity}/${id}`);

  const cols: ColumnDef<Row, unknown>[] = [
    ...columns.map(
      (c): ColumnDef<Row, unknown> => ({
        id: c.header,
        header: c.header,
        meta: { label: c.header },
        cell: (ctx) => c.cell(ctx.row.original),
      }),
    ),
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: (ctx) => (
        <div className="flex items-center justify-end gap-2">
          {ctx.row.original.annulledAt && <Badge variant="destructive">Anulada</Badge>}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              open(ctx.row.original.id);
            }}
          >
            <EyeIcon className="size-4" /> Ver
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      toolbar={
        <>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-56" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {action}
        </>
      }
      columns={cols}
      data={data?.items ?? []}
      total={data?.total ?? 0}
      page={page}
      pageSize={data?.pageSize ?? PAGE_SIZE}
      loading={isLoading}
      onPageChange={setPage}
      onRowClick={(row) => open(row.id)}
      emptyMessage={isError ? 'No se pudieron cargar los datos.' : 'Sin resultados.'}
    />
  );
}
