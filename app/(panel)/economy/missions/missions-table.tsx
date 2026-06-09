'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleCheckIcon, CircleOffIcon, PlusIcon, WrenchIcon } from 'lucide-react';
import {
  useMissionTemplates,
  MISSION_TYPE_LABELS,
  type MissionTemplate,
  type MissionTemplateListQuery,
  type MissionType,
} from '@/hooks/use-missions';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge } from '@/lib/status-badge';
import { RefreshConfigDialog } from './refresh-config-form';
import { Button } from '@/components/ui/button';
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

function rewardLabel(t: MissionTemplate): string {
  const parts: string[] = [];
  if (t.xpReward > 0) parts.push(`${t.xpReward} XP`);
  if (t.kokosReward > 0) parts.push(`${t.kokosReward} Kokos`);
  if (t.kolonesReward > 0) parts.push(`${t.kolonesReward} Kolones`);
  return parts.join(' · ') || '—';
}

const columns: ColumnDef<MissionTemplate, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Template',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.title}</span>
        <span className="text-muted-foreground text-xs">
          {MISSION_TYPE_LABELS[row.original.type]}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'country',
    header: 'País',
    cell: ({ row }) =>
      row.original.country ? `${row.original.country} · ${countryLabel(row.original.country)}` : 'Global',
  },
  { accessorKey: 'target', header: 'Meta' },
  { id: 'reward', header: 'Recompensa', cell: ({ row }) => rewardLabel(row.original) },
  { accessorKey: 'timesAssigned', header: 'Asignado' },
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

export function MissionsTable() {
  const router = useRouter();
  const [query, setQuery] = useState<MissionTemplateListQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useMissionTemplates(query);
  const set = (patch: Partial<MissionTemplateListQuery>) =>
    setQuery({ ...query, page: 1, ...patch });

  return (
    <DataTable
      toolbar={
        <>
          <Select
            value={query.type ?? ALL}
            onValueChange={(v) => set({ type: v === ALL ? undefined : (v as MissionType) })}
          >
            <SelectTrigger className="w-44" size="sm" aria-label="Filtrar por tipo">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {(Object.keys(MISSION_TYPE_LABELS) as MissionType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {MISSION_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={query.country ?? ALL}
            onValueChange={(v) => set({ country: v === ALL ? undefined : v })}
          >
            <SelectTrigger className="w-40" size="sm" aria-label="Filtrar por país">
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
            value={query.isActive === undefined ? ALL : query.isActive ? 'true' : 'false'}
            onValueChange={(v) => set({ isActive: v === ALL ? undefined : v === 'true' })}
          >
            <SelectTrigger className="w-32" size="sm" aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex flex-wrap gap-2">
            <RefreshConfigDialog />
            <Button asChild variant="outline" size="sm">
              <Link href="/economy/missions/intervention">
                <WrenchIcon className="size-4" />
                Intervención
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/economy/missions/new">
                <PlusIcon className="size-4" />
                Nuevo template
              </Link>
            </Button>
          </div>
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
      onRowClick={(t) => router.push(`/economy/missions/${t.id}/edit`)}
      emptyMessage="No hay templates con esos filtros"
    />
  );
}
