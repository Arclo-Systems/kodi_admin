'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BanIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  type LucideIcon,
} from 'lucide-react';
import { useUsers, type UserListItem, type UserListQuery } from '@/hooks/use-users';
import { DataTable } from '@/components/admin/data-table';
import { DataTableColumnHeader } from '@/components/admin/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import { UsersFilters } from './users-filters';

const STATUS: Record<string, { label: string; icon: LucideIcon; tone: StatusTone }> = {
  active: { label: 'Activo', icon: CircleCheckIcon, tone: 'success' },
  suspended: { label: 'Suspendido', icon: BanIcon, tone: 'destructive' },
  pending_parental: { label: 'Pendiente', icon: ClockIcon, tone: 'warning' },
  deleted: { label: 'Eliminado', icon: CircleDashedIcon, tone: 'muted' },
};

const columns: ColumnDef<UserListItem, unknown>[] = [
  {
    accessorKey: 'displayName',
    header: 'Usuario',
    meta: { label: 'Usuario' },
    cell: ({ row }) => {
      const inits =
        row.original.displayName
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? '')
          .join('') || '?';
      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {inits}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.displayName}</div>
            {row.original.username && (
              <div className="text-muted-foreground truncate text-xs">@{row.original.username}</div>
            )}
            <div className="text-muted-foreground truncate text-xs">{row.original.email}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'friendCode',
    header: 'Código',
    meta: { label: 'Código' },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">{row.original.friendCode}</span>
    ),
  },
  { accessorKey: 'country', header: 'País', meta: { label: 'País' } },
  {
    accessorKey: 'accountStatus',
    header: 'Estado',
    meta: { label: 'Estado' },
    cell: ({ row }) => {
      const cfg = STATUS[row.original.accountStatus];
      if (!cfg) return <Badge variant="outline">{row.original.accountStatus}</Badge>;
      return <StatusBadge tone={cfg.tone} icon={cfg.icon} label={cfg.label} />;
    },
  },
  {
    accessorKey: 'streakDays',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Racha" />,
    meta: { label: 'Racha' },
  },
  {
    accessorKey: 'lastActiveAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Última actividad" />,
    meta: { label: 'Última actividad' },
    cell: ({ row }) =>
      row.original.lastActiveAt ? new Date(row.original.lastActiveAt).toLocaleDateString('es') : '—',
  },
];

export function UsersTable({ allowedCountries }: { allowedCountries: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState<UserListQuery>({
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortDir: 'desc',
  });
  const { data, isLoading } = useUsers(query);

  return (
    <DataTable
      toolbar={
        <UsersFilters value={query} onChange={setQuery} allowedCountries={allowedCountries} />
      }
      columns={columns}
      data={data?.items ?? []}
      total={data?.total ?? 0}
      page={query.page}
      pageSize={query.pageSize}
      loading={isLoading}
      onPageChange={(page) => setQuery({ ...query, page })}
      onPageSizeChange={(pageSize) => setQuery({ ...query, page: 1, pageSize })}
      onRowClick={(u) => router.push(`/users/${u.id}`)}
    />
  );
}
