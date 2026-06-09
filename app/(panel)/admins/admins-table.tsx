'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { BanIcon, CircleCheckIcon, ClockIcon, type LucideIcon, PlusIcon } from 'lucide-react';
import { useAdmins, type AdminListItem } from '@/hooks/use-admins';
import { DataTable } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoleBadge } from '@/lib/roles';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import { CreateAdminDialog } from './create-admin-dialog';

// Estado con la convención de color (Activo = verde, igual que en usuarios).
const ADMIN_STATUS: Record<string, { label: string; icon: LucideIcon; tone: StatusTone }> = {
  active: { label: 'Activo', icon: CircleCheckIcon, tone: 'success' },
  inactive: { label: 'Inactivo', icon: BanIcon, tone: 'destructive' },
  pending_first_login: { label: 'Pendiente', icon: ClockIcon, tone: 'warning' },
};

const columns: ColumnDef<AdminListItem, unknown>[] = [
  {
    accessorKey: 'displayName',
    header: 'Nombre',
    meta: { label: 'Nombre' },
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.displayName}</div>
        <div className="text-muted-foreground text-xs">{row.original.email}</div>
      </div>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Rol',
    meta: { label: 'Rol' },
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
  },
  {
    id: 'scope',
    header: 'Scope',
    meta: { label: 'Scope' },
    cell: ({ row }) =>
      row.original.isGlobalScope ? (
        <Badge variant="outline">Global</Badge>
      ) : (
        <span className="text-sm">{row.original.assignedCountries.join(', ')}</span>
      ),
  },
  {
    accessorKey: 'adminActiveStatus',
    header: 'Estado',
    meta: { label: 'Estado' },
    cell: ({ row }) => {
      const status = row.original.adminActiveStatus;
      const st = status ? ADMIN_STATUS[status] : undefined;
      if (!st) return null;
      return <StatusBadge tone={st.tone} icon={st.icon} label={st.label} />;
    },
  },
  {
    accessorKey: 'lastActiveAt',
    header: 'Última actividad',
    meta: { label: 'Última actividad' },
    cell: ({ row }) =>
      row.original.lastActiveAt ? new Date(row.original.lastActiveAt).toLocaleString('es') : '—',
  },
];

export function AdminsTable() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useAdmins({ search, page, pageSize: 20 });

  return (
    <>
      <DataTable
        toolbar={
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder="Buscar por email o nombre…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 max-w-sm"
            />
            <Button onClick={() => setCreateOpen(true)} size="sm" className="ml-auto gap-2">
              <PlusIcon className="size-4" />
              Invitar admin
            </Button>
          </div>
        }
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={20}
        loading={isLoading}
        onPageChange={setPage}
        onRowClick={(a) => router.push(`/admins/${a.id}`)}
      />

      <CreateAdminDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
