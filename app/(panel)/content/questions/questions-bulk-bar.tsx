'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClipboardCheckIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useQuestionsBulk } from '@/hooks/use-content-bulk';
import type { QuestionListItem } from '@/hooks/use-questions';

// Clave de traspaso a la página de revisión del lote.
export const QUESTIONS_REVIEW_KEY = 'questions-review-selected';

export function QuestionsBulkBar({ items, onDone }: { items: QuestionListItem[]; onDone: () => void }) {
  const router = useRouter();
  const { remove } = useQuestionsBulk();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ids = items.map((i) => i.id);

  function review(): void {
    sessionStorage.setItem(QUESTIONS_REVIEW_KEY, JSON.stringify(items));
    router.push('/content/questions/review');
  }

  return (
    <div className="bg-muted/40 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
      <span className="text-sm font-medium">{items.length} seleccionadas</span>
      <Button size="sm" onClick={review}>
        <ClipboardCheckIcon className="size-4" /> Revisar y accionar ({items.length})
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={remove.isPending}
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2Icon className="size-4" /> Borrar ({items.length})
      </Button>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        destructive
        title={`Borrar ${items.length} preguntas`}
        description="Las preguntas con intentos registrados no se borran (desactivalas en su lugar)."
        confirmLabel="Borrar"
        onConfirm={async () => {
          const r = await remove.mutateAsync(ids);
          const skipped = r.skipped ? ` · ${r.skipped} con actividad omitidas` : '';
          toast.success(`${r.deleted} preguntas borradas${skipped}`);
          setConfirmDelete(false);
          onDone();
        }}
      />
    </div>
  );
}
