'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useRaffles,
  RAFFLE_STATUS_LABELS,
  type Raffle,
  type RaffleListQuery,
  type RaffleStatus,
} from '@/hooks/use-raffles';
import { useModulesTree } from '@/hooks/use-modules-tree';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge } from '@/lib/status-badge';
import { RAFFLE_STATUS_FARO } from '@/lib/raffle-status';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';

const ALL = '__all__';

function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

const columns: ColumnDef<Raffle, unknown>[] = [
  {
    id: 'cycle',
    header: 'Ciclo',
    meta: { label: 'Ciclo' },
    cell: ({ row }) =>
      `${String(row.original.cycleMonth).padStart(2, '0')}/${row.original.cycleYear}`,
  },
  {
    accessorKey: 'country',
    header: 'País',
    meta: { label: 'País' },
    cell: ({ row }) => `${row.original.country} · ${countryLabel(row.original.country)}`,
  },
  { accessorKey: 'moduleShortName', header: 'Módulo', meta: { label: 'Módulo' } },
  {
    accessorKey: 'name',
    header: 'Premiación',
    meta: { label: 'Premiación' },
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  { accessorKey: 'prizesCount', header: 'Premios', meta: { label: 'Premios' } },
  {
    id: 'winners',
    header: 'Ganadores',
    meta: { label: 'Ganadores' },
    cell: ({ row }) => `${row.original.winnersCount ?? 0} / ${row.original.entriesCount ?? 0}`,
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    meta: { label: 'Estado' },
    cell: ({ row }) => {
      const faro = RAFFLE_STATUS_FARO[row.original.status];
      return (
        <StatusBadge tone={faro.tone} icon={faro.icon} label={RAFFLE_STATUS_LABELS[row.original.status]} />
      );
    },
  },
];

export function RafflesTable() {
  const router = useRouter();
  const [query, setQuery] = useState<RaffleListQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useRaffles(query);
  const { data: tree } = useModulesTree(query.country ?? '');
  const modules = tree ?? [];
  const set = (patch: Partial<RaffleListQuery>) => setQuery({ ...query, page: 1, ...patch });

  return (
    <DataTable
      toolbar={
        <>
          <Select
            value={query.country ?? ALL}
            onValueChange={(v) => set({ country: v === ALL ? undefined : v, moduleId: undefined })}
          >
            <SelectTrigger className="w-44" size="sm" aria-label="Filtrar por país">
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los países</SelectItem>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} · {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={query.moduleId ?? ALL}
            onValueChange={(v) => set({ moduleId: v === ALL ? undefined : v })}
            disabled={!query.country}
          >
            <SelectTrigger className="w-44" size="sm" aria-label="Filtrar por módulo">
              <SelectValue placeholder={query.country ? 'Módulo' : 'Elegí país'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los módulos</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={query.status ?? ALL}
            onValueChange={(v) => set({ status: v === ALL ? undefined : (v as RaffleStatus) })}
          >
            <SelectTrigger className="w-40" size="sm" aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {(Object.keys(RAFFLE_STATUS_LABELS) as RaffleStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {RAFFLE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto" aria-hidden />
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
      onRowClick={(r) => router.push(`/economy/raffles/${r.id}`)}
      emptyMessage="No hay premiaciones con esos filtros"
    />
  );
}
