'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckIcon, PlusIcon, SendIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { CampaignStatusBadge } from '@/lib/campaign-status';
import {
  CAMPAIGNS_PAGE_SIZE,
  STATUS_LABELS,
  useCampaigns,
  useCampaignMutations,
  type Campaign,
  type CampaignStatus,
} from '@/hooks/use-messaging';

const ALL = 'all';
const STATUSES = Object.keys(STATUS_LABELS) as CampaignStatus[];
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');

export function CampaignsTable() {
  const router = useRouter();
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useCampaigns({
    page,
    pageSize: CAMPAIGNS_PAGE_SIZE,
    status: status === ALL ? undefined : status,
  });
  const { approve, sendNow, cancel } = useCampaignMutations();

  const [action, setAction] = useState<{ kind: 'approve' | 'send' | 'cancel'; c: Campaign } | null>(null);

  const run = async () => {
    if (!action) return;
    const fn = action.kind === 'approve' ? approve : action.kind === 'send' ? sendNow : cancel;
    await fn.mutateAsync(action.c.id);
    toast.success('Campaña actualizada');
    setAction(null);
  };

  const columns: ColumnDef<Campaign, unknown>[] = [
    {
      id: 'kind',
      header: 'Tipo',
      meta: { label: 'Tipo' },
      cell: ({ row }) => (row.original.kind === 'direct' ? '1-a-1' : 'Broadcast'),
    },
    {
      accessorKey: 'channel',
      header: 'Canal',
      meta: { label: 'Canal' },
      cell: ({ row }) => (row.original.channel === 'email' ? 'Email' : 'Push'),
    },
    {
      id: 'recipients',
      header: 'Destinatarios',
      meta: { label: 'Destinatarios' },
      cell: ({ row }) => {
        const c = row.original;
        return c.kind === 'direct'
          ? (c.targetUser?.displayName ?? '—')
          : `${c.segment?.name ?? 'segmento'} (~${c.estimatedCount.toLocaleString('es-CR')})`;
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      meta: { label: 'Estado' },
      cell: ({ row }) => <CampaignStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
      meta: { label: 'Fecha' },
      cell: ({ row }) => fmtDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-end gap-1">
            {c.status === 'pending_approval' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-success hover:text-success"
                onClick={(e) => { e.stopPropagation(); setAction({ kind: 'approve', c }); }}
              >
                <CheckIcon className="size-4" /> Aprobar
              </Button>
            )}
            {(c.status === 'draft' || c.status === 'approved') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary"
                onClick={(e) => { e.stopPropagation(); setAction({ kind: 'send', c }); }}
              >
                <SendIcon className="size-4" /> Enviar
              </Button>
            )}
            {(c.status === 'draft' || c.status === 'pending_approval') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); setAction({ kind: 'cancel', c }); }}
              >
                <XIcon className="size-4" /> Cancelar
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        toolbar={
          <>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-48" size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="ml-auto" asChild>
              <Link href="/messaging/new"><PlusIcon className="size-4" /> Nueva campaña</Link>
            </Button>
          </>
        }
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={CAMPAIGNS_PAGE_SIZE}
        loading={isLoading}
        onPageChange={setPage}
        onRowClick={(c) => router.push(`/messaging/${c.id}`)}
        emptyMessage={isError ? 'No se pudieron cargar las campañas.' : 'Sin campañas.'}
      />

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={
          action?.kind === 'approve' ? 'Aprobar campaña'
            : action?.kind === 'send' ? 'Enviar campaña'
            : 'Cancelar campaña'
        }
        description={
          action?.kind === 'send'
            ? `Se enviará a ~${action.c.estimatedCount.toLocaleString('es-CR')} destinatario(s).`
            : action?.kind === 'approve'
            ? 'Aprobás este broadcast masivo (requiere scope global).'
            : 'La campaña quedará cancelada.'
        }
        destructive={action?.kind === 'cancel'}
        confirmLabel="Confirmar"
        onConfirm={run}
      />
    </div>
  );
}
