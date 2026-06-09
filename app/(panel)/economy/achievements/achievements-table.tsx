'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleCheckIcon, CircleOffIcon, PencilIcon, PlusIcon } from 'lucide-react';
import {
  useAchievements,
  type Achievement,
  type AchievementListQuery,
  type AchievementTier,
} from '@/hooks/use-achievements';
import { describeCondition } from './condition-builder';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { DataTable } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/lib/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = '__all__';

const TIER_CFG: Record<
  AchievementTier,
  { v: 'default' | 'secondary' | 'outline'; l: string }
> = {
  common: { v: 'outline', l: 'Común' },
  uncommon: { v: 'outline', l: 'Poco común' },
  rare: { v: 'secondary', l: 'Raro' },
  epic: { v: 'default', l: 'Épico' },
};

const columns: ColumnDef<Achievement, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Logro',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-muted-foreground font-mono text-xs">{row.original.code}</span>
      </div>
    ),
  },
  {
    accessorKey: 'tier',
    header: 'Rareza',
    cell: ({ row }) => {
      const c = TIER_CFG[row.original.tier];
      return <Badge variant={c.v}>{c.l}</Badge>;
    },
  },
  {
    accessorKey: 'kokosReward',
    header: 'Kokos',
    cell: ({ row }) => row.original.kokosReward.toLocaleString('es-CR'),
  },
  {
    id: 'condition',
    header: 'Condición',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{describeCondition(row.original.condition)}</span>
    ),
  },
  { accessorKey: 'unlockedBy', header: 'Desbloqueado por' },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    cell: ({ row }) =>
      row.original.isActive ? (
        <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
      ) : (
        <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactivo" />
      ),
  },
];

export function AchievementsTable({ role }: { role: AdminRole }) {
  const router = useRouter();
  const [query, setQuery] = useState<AchievementListQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useAchievements(query);
  const set = (patch: Partial<AchievementListQuery>) => setQuery({ ...query, page: 1, ...patch });
  const canWrite = can(role, 'economy:achievement:write');

  const cols = useMemo<ColumnDef<Achievement, unknown>[]>(
    () => [
      ...columns,
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => <AchievementRowActions achievement={row.original} canWrite={canWrite} />,
      },
    ],
    [canWrite],
  );

  return (
    <DataTable
      toolbar={
        <>
          <Input
            placeholder="Buscar por código o nombre"
            className="h-8 w-60"
            defaultValue={query.search ?? ''}
            onChange={(e) => set({ search: e.target.value || undefined })}
          />
          <Select
            value={query.tier ?? ALL}
            onValueChange={(v) => set({ tier: v === ALL ? undefined : (v as AchievementTier) })}
          >
            <SelectTrigger className="w-40" size="sm" aria-label="Filtrar por rareza">
              <SelectValue placeholder="Rareza" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las rarezas</SelectItem>
              <SelectItem value="common">Común</SelectItem>
              <SelectItem value="uncommon">Poco común</SelectItem>
              <SelectItem value="rare">Raro</SelectItem>
              <SelectItem value="epic">Épico</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={query.isActive === undefined ? ALL : query.isActive ? 'true' : 'false'}
            onValueChange={(v) => set({ isActive: v === ALL ? undefined : v === 'true' })}
          >
            <SelectTrigger className="w-36" size="sm" aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          {canWrite && (
            <Button asChild size="sm" className="ml-auto">
              <Link href="/economy/achievements/new">
                <PlusIcon className="size-4" />
                Nuevo logro
              </Link>
            </Button>
          )}
        </>
      }
      columns={cols}
      data={data?.items ?? []}
      total={data?.total ?? 0}
      page={query.page}
      pageSize={query.pageSize}
      loading={isLoading}
      onPageChange={(page) => setQuery({ ...query, page })}
      onPageSizeChange={(pageSize) => setQuery({ ...query, page: 1, pageSize })}
      onRowClick={(a) => router.push(`/economy/achievements/${a.id}`)}
      emptyMessage="No hay logros con esos filtros"
    />
  );
}

// Acción inline: Editar (ghost neutro). El click de fila ya lleva al detalle; la activación se
// maneja en el form (update no es parcial).
function AchievementRowActions({
  achievement,
  canWrite,
}: {
  achievement: Achievement;
  canWrite: boolean;
}) {
  if (!canWrite) return null;
  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/economy/achievements/${achievement.id}/edit`}>
          <PencilIcon className="size-3.5" />
          Editar
        </Link>
      </Button>
    </div>
  );
}
