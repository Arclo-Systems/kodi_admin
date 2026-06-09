'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/admin/data-table';
import { useBotMetrics, type BotMetric } from '@/hooks/use-bots';

const columns: ColumnDef<BotMetric, unknown>[] = [
  {
    accessorKey: 'country',
    header: 'País',
    meta: { label: 'País' },
    cell: ({ row }) => <span className="font-medium">{row.original.country}</span>,
  },
  {
    accessorKey: 'winRate',
    header: 'Win-rate bots',
    meta: { label: 'Win-rate bots' },
    cell: ({ row }) => (
      <span className={row.original.alarmed ? 'text-destructive font-medium tabular-nums' : 'tabular-nums'}>
        {Math.round(row.original.winRate * 100)}%
      </span>
    ),
  },
  {
    id: 'wins',
    header: 'Victorias / Total',
    meta: { label: 'Victorias / Total' },
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.botWins} / {row.original.total}
      </span>
    ),
  },
  {
    accessorKey: 'date',
    header: 'Fecha',
    meta: { label: 'Fecha' },
    cell: ({ row }) => new Date(row.original.date).toLocaleDateString('es-CR'),
  },
  {
    id: 'alarm',
    header: '',
    enableHiding: false,
    cell: ({ row }) =>
      row.original.alarmed ? (
        <div className="flex justify-end">
          <Badge variant="destructive">Alarma &gt;55%</Badge>
        </div>
      ) : null,
  },
];

export function MetricsTab() {
  const { data, isLoading, isError } = useBotMetrics();
  const metrics = data ?? [];
  return (
    <DataTable
      columns={columns}
      data={metrics}
      total={metrics.length}
      page={1}
      pageSize={Math.max(metrics.length, 1)}
      loading={isLoading}
      onPageChange={() => {}}
      emptyMessage={
        isError
          ? 'No se pudieron cargar las métricas.'
          : 'Sin snapshots todavía (el cron de balance corre diario).'
      }
    />
  );
}
