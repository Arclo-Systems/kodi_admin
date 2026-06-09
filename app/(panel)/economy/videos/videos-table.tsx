'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleCheckIcon, CircleOffIcon, PlusIcon, VideoIcon } from 'lucide-react';
import {
  useAdminVideos,
  VIDEO_CONTEXT_LABELS,
  VIDEO_CONTEXTS,
  type AdminVideo,
  type VideoContext,
  type VideoListQuery,
} from '@/hooks/use-admin-videos';
import { useSponsorOptions } from '@/hooks/use-sponsors';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge } from '@/lib/status-badge';
import { Badge } from '@/components/ui/badge';
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

function windowLabel(v: AdminVideo): string {
  if (!v.startsAt && !v.endsAt) return 'Abierta';
  return `${v.startsAt ? v.startsAt.slice(0, 10) : '—'} → ${v.endsAt ? v.endsAt.slice(0, 10) : '—'}`;
}

const columns: ColumnDef<AdminVideo, unknown>[] = [
  {
    accessorKey: 'sponsorName',
    header: 'Sponsor',
    meta: { label: 'Sponsor' },
    enableSorting: false,
    cell: ({ row }) => <span className="font-medium">{row.original.sponsorName}</span>,
  },
  {
    accessorKey: 'country',
    header: 'País',
    meta: { label: 'País' },
    enableSorting: false,
    cell: ({ row }) => `${row.original.country} · ${countryLabel(row.original.country)}`,
  },
  {
    accessorKey: 'context',
    header: 'Contexto',
    meta: { label: 'Contexto' },
    enableSorting: false,
    cell: ({ row }) => <Badge variant="secondary">{VIDEO_CONTEXT_LABELS[row.original.context]}</Badge>,
  },
  {
    accessorKey: 'moduleShortName',
    header: 'Módulo',
    meta: { label: 'Módulo' },
    enableSorting: false,
    cell: ({ row }) => row.original.moduleShortName ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'durationSec',
    header: 'Duración',
    meta: { label: 'Duración' },
    enableSorting: false,
    cell: ({ row }) => `${row.original.durationSec}s`,
  },
  { accessorKey: 'weight', header: 'Peso', meta: { label: 'Peso' }, enableSorting: false },
  {
    id: 'window',
    header: 'Ventana',
    meta: { label: 'Ventana' },
    enableSorting: false,
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{windowLabel(row.original)}</span>,
  },
  {
    id: 'views',
    header: 'Impr / Compl',
    meta: { label: 'Impresiones / Completadas' },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.impressionCount.toLocaleString('es-CR')} /{' '}
        {row.original.completionCount.toLocaleString('es-CR')}
      </span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    meta: { label: 'Estado' },
    enableSorting: false,
    cell: ({ row }) =>
      row.original.isActive ? (
        <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
      ) : (
        <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactivo" />
      ),
  },
];

export function VideosTable() {
  const router = useRouter();
  const [query, setQuery] = useState<VideoListQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useAdminVideos(query);
  const { data: sponsors } = useSponsorOptions();
  const set = (patch: Partial<VideoListQuery>) => setQuery({ ...query, page: 1, ...patch });

  return (
    <DataTable
      toolbar={
        <>
          <Select
            value={query.sponsorId ?? ALL}
            onValueChange={(v) => set({ sponsorId: v === ALL ? undefined : v })}
          >
            <SelectTrigger className="w-44" size="sm" aria-label="Filtrar por sponsor">
              <SelectValue placeholder="Sponsor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los sponsors</SelectItem>
              {(sponsors ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
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
            value={query.context ?? ALL}
            onValueChange={(v) => set({ context: v === ALL ? undefined : (v as VideoContext) })}
          >
            <SelectTrigger className="w-40" size="sm" aria-label="Filtrar por contexto">
              <SelectValue placeholder="Contexto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los contextos</SelectItem>
              {VIDEO_CONTEXTS.map((c) => (
                <SelectItem key={c} value={c}>
                  {VIDEO_CONTEXT_LABELS[c]}
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
            <Button asChild size="sm">
              <Link href="/economy/videos/new">
                <PlusIcon className="size-4" />
                Nuevo video
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
      onRowClick={(v) => router.push(`/economy/videos/${v.id}/edit`)}
      emptyIcon={<VideoIcon />}
      emptyMessage="No hay videos con esos filtros"
    />
  );
}
