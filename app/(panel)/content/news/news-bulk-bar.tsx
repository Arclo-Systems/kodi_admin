'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { SendIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useNewsBulk } from '@/hooks/use-content-bulk';

export function NewsBulkBar({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { publish, remove } = useNewsBulk();
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const busy = publish.isPending || remove.isPending;

  return (
    <div className="bg-muted/40 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
      <span className="text-sm font-medium">{ids.length} seleccionadas</span>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirmPublish(true)}>
        <SendIcon className="size-4" /> Publicar ({ids.length})
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={busy}
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2Icon className="size-4" /> Borrar ({ids.length})
      </Button>

      <ConfirmDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title={`Publicar ${ids.length} noticias`}
        description="Las noticias ya publicadas no cambian de fecha."
        confirmLabel="Publicar"
        onConfirm={async () => {
          const r = await publish.mutateAsync(ids);
          toast.success(`${r.published} noticias publicadas`);
          setConfirmPublish(false);
          onDone();
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        destructive
        title={`Borrar ${ids.length} noticias`}
        description="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        onConfirm={async () => {
          const r = await remove.mutateAsync(ids);
          toast.success(`${r.deleted} noticias borradas`);
          setConfirmDelete(false);
          onDone();
        }}
      />
    </div>
  );
}
