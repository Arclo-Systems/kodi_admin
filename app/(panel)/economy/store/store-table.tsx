'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleCheckIcon, CircleOffIcon, PlusIcon } from 'lucide-react';
import {
  useStoreItems,
  CATEGORY_LABELS,
  ITEM_TYPE_LABELS,
  STORE_ITEM_TYPES,
  TIER_LABELS,
  type StoreCategory,
  type StoreItem,
  type StoreItemType,
  type StoreListQuery,
} from '@/hooks/use-store';
import { DataTable } from '@/components/admin/data-table';
import { StoreInventoryDialog } from './store-inventory';
import { StatusBadge } from '@/lib/status-badge';
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

const columns: ColumnDef<StoreItem, unknown>[] = [
  {
    id: 'thumb',
    header: '',
    cell: ({ row }) =>
      row.original.previewUrl ? (
        <Image
          src={row.original.previewUrl}
          alt=""
          width={36}
          height={36}
          className="rounded object-cover"
          unoptimized
        />
      ) : (
        <div className="bg-muted size-9 rounded" />
      ),
  },
  {
    accessorKey: 'name',
    header: 'Ítem',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-muted-foreground text-xs">
          {ITEM_TYPE_LABELS[row.original.itemType]}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Categoría',
    cell: ({ row }) => CATEGORY_LABELS[row.original.category],
  },
  { accessorKey: 'tier', header: 'Tier', cell: ({ row }) => TIER_LABELS[row.original.tier] },
  {
    accessorKey: 'kokosPrice',
    header: 'Kokos',
    cell: ({ row }) => row.original.kokosPrice.toLocaleString('es-CR'),
  },
  {
    accessorKey: 'country',
    header: 'País',
    cell: ({ row }) =>
      row.original.country ? `${row.original.country} · ${countryLabel(row.original.country)}` : 'Global',
  },
  { accessorKey: 'ownedBy', header: 'Comprado', cell: ({ row }) => row.original.ownedBy ?? 0 },
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

export function StoreTable() {
  const router = useRouter();
  const [query, setQuery] = useState<StoreListQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useStoreItems(query);
  const set = (patch: Partial<StoreListQuery>) => setQuery({ ...query, page: 1, ...patch });

  return (
    <DataTable
      toolbar={
        <>
          <Select
            value={query.category ?? ALL}
            onValueChange={(v) => set({ category: v === ALL ? undefined : (v as StoreCategory) })}
          >
            <SelectTrigger className="w-36" size="sm" aria-label="Filtrar por categoría">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              <SelectItem value="cosmetic">Cosmético</SelectItem>
              <SelectItem value="functional">Funcional</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={query.itemType ?? ALL}
            onValueChange={(v) => set({ itemType: v === ALL ? undefined : (v as StoreItemType) })}
          >
            <SelectTrigger className="w-44" size="sm" aria-label="Filtrar por tipo">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {STORE_ITEM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ITEM_TYPE_LABELS[t]}
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
            <StoreInventoryDialog />
            <Button asChild size="sm">
              <Link href="/economy/store/new">
                <PlusIcon className="size-4" />
                Nuevo ítem
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
      onRowClick={(i) => router.push(`/economy/store/${i.id}/edit`)}
      emptyMessage="No hay ítems con esos filtros"
    />
  );
}
