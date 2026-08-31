'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, MailCheckIcon, MailIcon, SendIcon, UsersIcon } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { KpiCard } from '@/components/admin/kpi-card';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import {
  useWaitlist,
  useWaitlistNotify,
  useWaitlistStats,
  waitlistQueryString,
  type WaitlistQuery,
  type WaitlistSignup,
  type WaitlistStatus,
} from '@/hooks/use-waitlist';

const TODOS = 'all';

const fmtFecha = (iso: string) => new Date(iso).toLocaleDateString('es-CR');
const fmtFechaHora = (iso: string) => new Date(iso).toLocaleString('es-CR');

const columns: ColumnDef<WaitlistSignup, unknown>[] = [
  {
    accessorKey: 'email',
    header: 'Correo',
    meta: { label: 'Correo' },
    cell: ({ row }) => <span className="font-medium">{row.original.email}</span>,
  },
  {
    accessorKey: 'createdAt',
    header: 'Se anotó',
    meta: { label: 'Se anotó' },
    cell: ({ row }) => fmtFechaHora(row.original.createdAt),
  },
  {
    accessorKey: 'source',
    header: 'Origen',
    meta: { label: 'Origen' },
    cell: ({ row }) => <Badge variant="outline">{row.original.source}</Badge>,
  },
  {
    accessorKey: 'notifiedAt',
    header: 'Aviso',
    meta: { label: 'Aviso' },
    cell: ({ row }) =>
      row.original.notifiedAt ? (
        <Badge variant="secondary">Avisado {fmtFecha(row.original.notifiedAt)}</Badge>
      ) : (
        <span className="text-muted-foreground">Pendiente</span>
      ),
  },
];

export function WaitlistTab({ role }: { role: AdminRole }) {
  const [query, setQuery] = useState<WaitlistQuery>({ page: 1, pageSize: 50 });
  const { data, isLoading, isError } = useWaitlist(query);
  const { data: stats } = useWaitlistStats();
  const notify = useWaitlistNotify();
  // Mandar el anuncio es la acción menos reversible del panel: la gatea el mismo
  // permiso de escritura de Lanzamientos, y el backend además la restringe a admin.
  const puedeAvisar = can(role, 'launches:write');

  const [confirmando, setConfirmando] = useState(false);

  const pendientes = stats?.pending ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="En la lista"
          value={stats?.total ?? 0}
          loading={!stats}
          icon={<UsersIcon className="size-4" />}
        />
        <KpiCard
          label="Sin avisar"
          value={pendientes}
          tone="amber"
          loading={!stats}
          icon={<MailIcon className="size-4" />}
        />
        <KpiCard
          label="Ya avisados"
          value={stats?.notified ?? 0}
          tone="green"
          loading={!stats}
          icon={<MailCheckIcon className="size-4" />}
        />
      </div>

      <DataTable
        toolbar={
          <>
            <Input
              placeholder="Buscar por correo…"
              value={query.search ?? ''}
              onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })}
              className="h-8 max-w-sm"
            />
            <Select
              value={query.status ?? TODOS}
              onValueChange={(v) =>
                setQuery({
                  ...query,
                  status: v === TODOS ? undefined : (v as WaitlistStatus),
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-44" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                <SelectItem value="pending">Sin avisar</SelectItem>
                <SelectItem value="notified">Ya avisados</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" asChild>
                {/* Descarga directa del BFF: el CSV nunca pasa por el cliente. */}
                <a href={`/api/admin/launches/waitlist/export?${waitlistQueryString(query)}`}>
                  <DownloadIcon className="size-4" /> Exportar CSV
                </a>
              </Button>
              {puedeAvisar && (
                <Button
                  size="sm"
                  disabled={pendientes === 0 || notify.isPending}
                  onClick={() => setConfirmando(true)}
                >
                  <SendIcon className="size-4" /> Avisar del lanzamiento
                </Button>
              )}
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
        emptyMessage={
          isError ? 'No se pudo cargar la lista de espera.' : 'Todavía nadie dejó su correo.'
        }
      />

      <ConfirmDialog
        open={confirmando}
        onOpenChange={setConfirmando}
        title="Avisar del lanzamiento de iOS"
        description={`Se le va a escribir a ${pendientes} ${
          pendientes === 1 ? 'persona' : 'personas'
        } que todavía no recibieron el aviso. El correo lleva el enlace del App Store de la última versión de iOS registrada. Esto no se puede deshacer.`}
        confirmLabel="Mandar el aviso"
        onConfirm={async () => {
          const res = await notify.mutateAsync();
          toast.success(
            res.queued
              ? `Envío encolado para ${res.pending} ${res.pending === 1 ? 'persona' : 'personas'}.`
              : 'No quedaba nadie sin avisar.',
          );
          setConfirmando(false);
        }}
      />
    </div>
  );
}
