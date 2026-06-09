'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleCheckIcon, CircleOffIcon, PencilIcon, PlusIcon, PowerIcon, PowerOffIcon } from 'lucide-react';
import {
  useCoupons,
  useCouponMutations,
  type CouponListItem,
  type CouponListQuery,
  type CouponTier,
} from '@/hooks/use-coupons';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { StatusBadge } from '@/lib/status-badge';
import { COUNTRIES } from '@/lib/countries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = '__all__';

function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

const TIER_CFG: Record<CouponTier, { v: 'default' | 'secondary' | 'outline'; l: string }> = {
  basico: { v: 'outline', l: 'Básico' },
  estandar: { v: 'secondary', l: 'Estándar' },
  premium: { v: 'default', l: 'Premium' },
};

function stockLabel(c: CouponListItem): string {
  if (c.stockTotal === null) return '∞';
  return `${c.stockRemaining ?? 0} / ${c.stockTotal}`;
}

const columns: ColumnDef<CouponListItem, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Título',
    cell: ({ row }) => <div className="max-w-xs truncate font-medium">{row.original.title}</div>,
  },
  { accessorKey: 'sponsorName', header: 'Sponsor' },
  {
    accessorKey: 'tier',
    header: 'Tier',
    cell: ({ row }) => {
      const c = TIER_CFG[row.original.tier];
      return <Badge variant={c.v}>{c.l}</Badge>;
    },
  },
  {
    accessorKey: 'country',
    header: 'País',
    cell: ({ row }) => `${row.original.country} · ${countryLabel(row.original.country)}`,
  },
  {
    accessorKey: 'kolonesCost',
    header: 'Kolones',
    cell: ({ row }) => row.original.kolonesCost.toLocaleString('es-CR'),
  },
  { id: 'stock', header: 'Stock', cell: ({ row }) => stockLabel(row.original) },
  { accessorKey: 'redeemedCount', header: 'Canjes' },
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

export function CouponsTable({ role }: { role: AdminRole }) {
  const router = useRouter();
  const canWrite = can(role, 'economy:coupon:write');
  const [query, setQuery] = useState<CouponListQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useCoupons(query);
  const set = (patch: Partial<CouponListQuery>) => setQuery({ ...query, page: 1, ...patch });

  const cols = useMemo<ColumnDef<CouponListItem, unknown>[]>(
    () => [
      ...columns,
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => <CouponRowActions coupon={row.original} canWrite={canWrite} />,
      },
    ],
    [canWrite],
  );

  return (
    <DataTable
      toolbar={
        <>
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
            value={query.tier ?? ALL}
            onValueChange={(v) => set({ tier: v === ALL ? undefined : (v as CouponTier) })}
          >
            <SelectTrigger className="w-40" size="sm" aria-label="Filtrar por tier">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tiers</SelectItem>
              <SelectItem value="basico">Básico</SelectItem>
              <SelectItem value="estandar">Estándar</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
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
              <Link href="/economy/coupons/new">
                <PlusIcon className="size-4" />
                Nuevo cupón
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
      onRowClick={(c) => router.push(`/economy/coupons/${c.id}`)}
      emptyMessage="No hay cupones con esos filtros"
    />
  );
}

// Acciones inline por fila: Editar (teal) · Activar (verde) / Desactivar (coral), ambos ghost.
// El click de fila ya navega al detalle, por eso no hay botón "Ver". stopPropagation evita
// que las acciones disparen ese click.
function CouponRowActions({ coupon, canWrite }: { coupon: CouponListItem; canWrite: boolean }) {
  const { update } = useCouponMutations();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {canWrite && (
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/economy/coupons/${coupon.id}/edit`}>
              <PencilIcon className="size-3.5" />
              Editar
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={
              coupon.isActive
                ? 'text-destructive hover:text-destructive'
                : 'text-success hover:text-success'
            }
            onClick={() => setConfirmOpen(true)}
          >
            {coupon.isActive ? (
              <PowerOffIcon className="size-3.5" />
            ) : (
              <PowerIcon className="size-3.5" />
            )}
            {coupon.isActive ? 'Desactivar' : 'Activar'}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={coupon.isActive ? 'Desactivar cupón' : 'Activar cupón'}
            description={
              coupon.isActive
                ? 'El cupón dejará de estar disponible para canje.'
                : 'El cupón volverá a estar disponible para canje.'
            }
            destructive={coupon.isActive}
            confirmLabel={coupon.isActive ? 'Desactivar' : 'Activar'}
            onConfirm={async () => {
              await update.mutateAsync({ id: coupon.id, input: { isActive: !coupon.isActive } });
              toast.success(coupon.isActive ? 'Cupón desactivado' : 'Cupón activado');
            }}
          />
        </>
      )}
    </div>
  );
}
