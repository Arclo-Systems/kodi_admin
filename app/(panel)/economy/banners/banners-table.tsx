'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleCheckIcon, CircleOffIcon, PlusIcon } from 'lucide-react';
import {
  useBanners,
  BANNER_PLACEMENTS,
  PLACEMENT_LABELS,
  type Banner,
  type BannerListQuery,
  type BannerPlacement,
} from '@/hooks/use-banners';
import { DataTable } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/lib/status-badge';
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

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('es-CR', { dateStyle: 'short' });
}

const columns: ColumnDef<Banner, unknown>[] = [
  { accessorKey: 'sponsorName', header: 'Sponsor' },
  {
    accessorKey: 'placement',
    header: 'Placement',
    cell: ({ row }) => PLACEMENT_LABELS[row.original.placement],
  },
  {
    accessorKey: 'country',
    header: 'País',
    cell: ({ row }) => `${row.original.country} · ${countryLabel(row.original.country)}`,
  },
  { accessorKey: 'weight', header: 'Peso' },
  {
    id: 'window',
    header: 'Vigencia',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {fmtDate(row.original.startsAt)} – {fmtDate(row.original.endsAt)}
      </span>
    ),
  },
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

export function BannersTable() {
  const router = useRouter();
  const [query, setQuery] = useState<BannerListQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useBanners(query);
  const set = (patch: Partial<BannerListQuery>) => setQuery({ ...query, page: 1, ...patch });

  return (
    <DataTable
      toolbar={
        <>
          <Select
            value={query.placement ?? ALL}
            onValueChange={(v) =>
              set({ placement: v === ALL ? undefined : (v as BannerPlacement) })
            }
          >
            <SelectTrigger className="w-52" size="sm" aria-label="Filtrar por placement">
              <SelectValue placeholder="Placement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los placements</SelectItem>
              {BANNER_PLACEMENTS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PLACEMENT_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={query.country ?? ALL}
            onValueChange={(v) => set({ country: v === ALL ? undefined : v })}
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
          <Button asChild size="sm" className="ml-auto">
            <Link href="/economy/banners/new">
              <PlusIcon className="size-4" />
              Nuevo banner
            </Link>
          </Button>
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
      onRowClick={(b) => router.push(`/economy/banners/${b.id}`)}
      emptyMessage="No hay banners con esos filtros"
    />
  );
}
