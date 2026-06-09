'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BanIcon, CheckIcon, RotateCcwIcon, SendIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import {
  useQuestionAction,
  type QuestionDetail,
  type QuestionWorkflowAction,
} from '@/hooks/use-questions';
import { QuestionStatusBadge } from '@/lib/question-status';

export function QuestionActions({ question, role }: { question: QuestionDetail; role: AdminRole }) {
  const action = useQuestionAction();
  const canActivate = can(role, 'content:question:activate');
  const s = question.status;
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const run = (a: QuestionWorkflowAction, ok: string) =>
    action.mutate(
      { id: question.id, action: a },
      { onSuccess: () => toast.success(ok), onError: (e: Error) => toast.error(e.message) },
    );

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
      <span className="text-sm font-medium">Estado</span>
      <QuestionStatusBadge status={s} />

      <div className="ml-auto flex flex-wrap gap-2">
        {s === 'draft' && (
          <Button
            size="sm"
            disabled={action.isPending}
            onClick={() => run('submit-review', 'Enviada a revisión')}
          >
            <SendIcon className="size-4" /> Enviar a revisión
          </Button>
        )}
        {s === 'review' && canActivate && (
          <Button
            size="sm"
            disabled={action.isPending}
            onClick={() => run('approve', 'Pregunta aprobada')}
          >
            <CheckIcon className="size-4" /> Aprobar
          </Button>
        )}
        {s === 'review' && (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={action.isPending}
            onClick={() => run('reject', 'Devuelta a borrador')}
          >
            <XIcon className="size-4" /> Rechazar
          </Button>
        )}
        {s !== 'inactive' && canActivate && (
          <Button
            size="sm"
            variant="destructive"
            disabled={action.isPending}
            onClick={() => setConfirmDeactivate(true)}
          >
            <BanIcon className="size-4" /> Desactivar
          </Button>
        )}
        {s === 'inactive' && canActivate && (
          <Button
            size="sm"
            variant="outline"
            disabled={action.isPending}
            onClick={() => run('restore', 'Pregunta restaurada')}
          >
            <RotateCcwIcon className="size-4" /> Restaurar
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={(o) => !o && setConfirmDeactivate(false)}
        destructive
        title="Desactivar pregunta"
        description="Dejará de aparecer en la app. Podés restaurarla después."
        confirmLabel="Desactivar"
        onConfirm={async () => {
          await action.mutateAsync({ id: question.id, action: 'delete' });
          toast.success('Pregunta desactivada');
        }}
      />
    </div>
  );
}
