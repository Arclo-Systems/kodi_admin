'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { useAppVersions, useVersionMutations, type AppPlatform, type AppVersion } from '@/hooks/use-launches';
import { VersionFormDialog } from './version-form-dialog';

const ALL = 'all';
const PLATFORM_LABEL: Record<AppPlatform, string> = { ios: 'iOS', android: 'Android' };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');

export function VersionsTab({ role }: { role: AdminRole }) {
  const [platform, setPlatform] = useState(ALL);
  const { data, isLoading, isError } = useAppVersions(platform === ALL ? undefined : (platform as AppPlatform));
  const { remove } = useVersionMutations();
  const canWrite = can(role, 'launches:write');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppVersion | null>(null);
  const [deleting, setDeleting] = useState<AppVersion | null>(null);

  const items = data ?? [];

  function openCreate(): void {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(v: AppVersion): void {
    setEditing(v);
    setFormOpen(true);
  }

  const columns: ColumnDef<AppVersion, unknown>[] = [
    {
      accessorKey: 'platform',
      header: 'Plataforma',
      meta: { label: 'Plataforma' },
      cell: ({ row }) => <Badge variant="outline">{PLATFORM_LABEL[row.original.platform]}</Badge>,
    },
    {
      accessorKey: 'version',
      header: 'Versión',
      meta: { label: 'Versión' },
      cell: ({ row }) => <span className="font-medium">{row.original.version}</span>,
    },
    {
      accessorKey: 'releaseDate',
      header: 'Fecha',
      meta: { label: 'Fecha' },
      cell: ({ row }) => fmtDate(row.original.releaseDate),
    },
    {
      accessorKey: 'releaseNotes',
      header: 'Notas',
      meta: { label: 'Notas' },
      cell: ({ row }) => (
        <span className="text-muted-foreground block max-w-xs truncate">
          {row.original.releaseNotes ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'storeUrl',
      header: 'Store',
      meta: { label: 'Store' },
      cell: ({ row }) =>
        row.original.storeUrl ? (
          <a
            href={row.original.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
            onClick={(e) => e.stopPropagation()}
          >
            Abrir
          </a>
        ) : (
          '—'
        ),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) =>
        canWrite ? (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
              <PencilIcon className="size-4" /> Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleting(row.original)}
            >
              <Trash2Icon className="size-4" /> Borrar
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        toolbar={
          <>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-48" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las plataformas</SelectItem>
                <SelectItem value="ios">iOS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
              </SelectContent>
            </Select>
            {canWrite && (
              <Button size="sm" className="ml-auto" onClick={openCreate}>
                <PlusIcon className="size-4" /> Nueva versión
              </Button>
            )}
          </>
        }
        columns={columns}
        data={items}
        total={items.length}
        page={1}
        pageSize={Math.max(items.length, 1)}
        loading={isLoading}
        onPageChange={() => {}}
        emptyMessage={isError ? 'No se pudieron cargar las versiones.' : 'Sin versiones registradas.'}
      />

      {formOpen && <VersionFormDialog version={editing} open onOpenChange={setFormOpen} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Borrar versión"
        description={
          deleting ? `Se borrará ${PLATFORM_LABEL[deleting.platform]} ${deleting.version} del registro.` : ''
        }
        destructive
        confirmLabel="Borrar"
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.id);
          toast.success('Versión borrada');
          setDeleting(null);
        }}
      />
    </div>
  );
}
