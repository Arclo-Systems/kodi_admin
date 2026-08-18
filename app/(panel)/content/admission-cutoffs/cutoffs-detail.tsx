'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckIcon, Trash2Icon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { useCutoff, useCutoffMatches, useCutoffMutations } from '@/hooks/use-cutoffs';
import { CutoffStatusBadge } from '@/lib/cutoff-status';
import { CutoffsDiff } from './cutoffs-diff';
import { CutoffsMatchesTable } from './cutoffs-matches-table';

export function CutoffsDetail({ id, role }: { id: string; role: AdminRole }) {
  const router = useRouter();
  const { data, isLoading } = useCutoff(id);
  const matches = useCutoffMatches(id);
  const m = useCutoffMutations();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (!data) return <p className="text-muted-foreground">No se encontró la subida.</p>;

  const canApprove = can(role, 'content:cutoffs:approve');
  const pending = data.status === 'pending_review';
  // D10: ningún corte se aplica sin carrera; el gate real está en el backend (422 MATCHES_PENDING).
  const pendingMatches = matches.data?.pending ?? 0;
  const approveBlocked = pendingMatches > 0;

  const approveButton = (
    <Button size="sm" disabled={approveBlocked} onClick={() => setApproveOpen(true)}>
      <CheckIcon className="size-4" />
      Aprobar
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <span className="text-sm font-medium">Estado</span>
        <CutoffStatusBadge status={data.status} />
        <span className="text-muted-foreground text-sm">
          {data.country} · {data.year}
        </span>
        {data.rejectionReason && (
          <span className="text-muted-foreground text-sm">· Motivo: {data.rejectionReason}</span>
        )}
        {pending && canApprove && (
          <div className="ml-auto flex gap-2">
            {approveBlocked ? (
              <Tooltip>
                {/* El botón deshabilitado no emite eventos: el span le da al tooltip un trigger. */}
                <TooltipTrigger asChild>
                  <span>{approveButton}</span>
                </TooltipTrigger>
                <TooltipContent>
                  {pendingMatches === 1
                    ? 'Falta 1 carrera por emparejar'
                    : `Faltan ${pendingMatches} carreras por emparejar`}
                </TooltipContent>
              </Tooltip>
            ) : (
              approveButton
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setRejectOpen(true)}
            >
              <XIcon className="size-4" />
              Rechazar
            </Button>
          </div>
        )}
        {data.status === 'rejected' && canApprove && (
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon className="size-4" />
              Eliminar
            </Button>
          </div>
        )}
      </div>

      {pending && (
        <CutoffsMatchesTable id={data.id} canEdit={can(role, 'content:cutoffs:upload')} />
      )}

      <CutoffsDiff upload={data} />

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Aprobar y aplicar cortes"
        description={`Se insertarán ${data.diffSummary.toInsert} cortes y se eliminarán ${data.diffSummary.toDelete} vigentes del módulo y año. La acción reemplaza los cortes actuales.`}
        confirmLabel="Aprobar"
        onConfirm={async () => {
          await m.approve.mutateAsync(data.id);
          toast.success('Cortes aplicados');
        }}
      />

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Rechazar subida"
        description="Indicá el motivo del rechazo."
        requireReason
        destructive
        confirmLabel="Rechazar"
        onConfirm={async ({ reason }) => {
          await m.reject.mutateAsync({ id: data.id, reason: reason ?? '' });
          toast.success('Subida rechazada');
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar subida rechazada"
        description="Se borra el registro de esta carga rechazada. No afecta los cortes vigentes."
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          await m.remove.mutateAsync(data.id);
          toast.success('Subida eliminada');
          router.push('/content/admission-cutoffs');
        }}
      />
    </div>
  );
}
