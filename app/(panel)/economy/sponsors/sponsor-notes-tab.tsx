'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2Icon } from 'lucide-react';
import {
  useSponsorNotes,
  useSponsorNoteMutations,
  type SponsorNote,
} from '@/hooks/use-sponsors';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';

export function SponsorNotesTab({ sponsorId }: { sponsorId: string }) {
  const { data: notes, isLoading } = useSponsorNotes(sponsorId);
  const { create, remove } = useSponsorNoteMutations(sponsorId);
  const [body, setBody] = useState('');
  const [toDelete, setToDelete] = useState<SponsorNote | null>(null);

  async function add(): Promise<void> {
    const text = body.trim();
    if (!text) return;
    try {
      await create.mutateAsync(text);
      setBody('');
      toast.success('Nota agregada');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribí una nota…"
          rows={3}
          maxLength={4000}
          aria-label="Nueva nota"
        />
        <Button size="sm" onClick={add} disabled={!body.trim() || create.isPending}>
          Agregar nota
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : (notes?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground text-sm">Sin notas todavía.</p>
      ) : (
        <ul className="space-y-2">
          {notes!.map((n) => (
            <li key={n.id} className="rounded-lg border p-3">
              <p className="text-sm whitespace-pre-wrap">{n.body}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  {new Date(n.createdAt).toLocaleString('es-CR')}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive size-7"
                  aria-label="Eliminar nota"
                  onClick={() => setToDelete(n)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar nota"
        description="Se borra la nota permanentemente."
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!toDelete) return;
          await remove.mutateAsync(toDelete.id);
          toast.success('Nota eliminada');
        }}
      />
    </div>
  );
}
