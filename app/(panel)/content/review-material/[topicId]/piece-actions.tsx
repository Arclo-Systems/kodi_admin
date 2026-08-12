'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, EyeOffIcon, SendIcon, SparklesIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  useReviewMaterialMutations,
  type PieceState,
  type PodcastState,
  type ReviewPiece,
} from '@/hooks/use-review-material';
import { PieceBadge } from '../piece-badge';

const PIECE_LABEL: Record<ReviewPiece, string> = {
  flashcards: 'las tarjetas',
  summary: 'el resumen',
  podcast: 'el podcast',
};

type ConfirmKind = 'publish' | 'unpublish' | 'reject';

const CONFIRM_TITLE: Record<ConfirmKind, string> = {
  publish: 'Publicar pieza',
  unpublish: 'Despublicar pieza',
  reject: 'Rechazar la revisión',
};

const CONFIRM_LABEL: Record<ConfirmKind, string> = {
  publish: 'Publicar',
  unpublish: 'Despublicar',
  reject: 'Rechazar',
};

function confirmDescription(kind: ConfirmKind | null, piece: string): string {
  if (kind === 'unpublish') return `Los usuarios dejan de ver ${piece} de este tema.`;
  if (kind === 'reject')
    return `${piece} vuelve a borrador y el motivo queda en el historial del tema.`;
  return `${piece} de este tema queda visible para los usuarios con acceso.`;
}

/**
 * Barra de acciones de una pieza: estado, generación con IA y publicación.
 * Publicar/despublicar solo se renderiza para quien puede (U3) — nunca un botón
 * que va a dar 403.
 */
export function PieceActions({
  topicId,
  piece,
  state,
  canPublish,
  withCount = false,
}: {
  topicId: string;
  piece: ReviewPiece;
  state: PieceState | PodcastState;
  canPublish: boolean;
  withCount?: boolean;
}) {
  const { generateWithAi, setPublished, runWorkflow } =
    useReviewMaterialMutations(topicId);
  const [aiOpen, setAiOpen] = useState(false);
  const [count, setCount] = useState(10);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);

  const published = state === 'published';
  const exists = state !== 'empty';
  const inReview = state === 'review';
  // El podcast se revisa con su propio circuito (guión → audio → publicar), que
  // vive en su pestaña: acá no se le ofrece el ciclo de tarjetas/resumen.
  const hasReviewCycle = piece !== 'podcast';

  async function runAction(
    action: 'submit-review' | 'approve',
    ok: string,
  ): Promise<void> {
    try {
      await runWorkflow.mutateAsync({ piece, action });
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
    }
  }

  async function generate(): Promise<void> {
    try {
      const result = await generateWithAi.mutateAsync({
        piece,
        count: withCount ? count : undefined,
      });
      toast.success(
        piece === 'flashcards'
          ? `${result?.generated ?? 0} tarjetas generadas como borrador`
          : 'Borrador generado — revisalo antes de publicar',
      );
      setAiOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el borrador');
    }
  }

  async function togglePublished(publish: boolean): Promise<void> {
    try {
      await setPublished.mutateAsync({ piece, published: publish });
      toast.success(publish ? 'Pieza publicada' : 'Pieza despublicada');
      setConfirm(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cambiar la publicación');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PieceBadge state={state} />
      <div className="ml-auto flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAiOpen(true)}
          disabled={published || generateWithAi.isPending}
          title={published ? 'Despublicá la pieza para regenerarla' : undefined}
        >
          <SparklesIcon className="size-4" />
          Generar con IA
        </Button>
        {hasReviewCycle && state === 'draft' && (
          <Button
            size="sm"
            variant={canPublish ? 'outline' : 'default'}
            disabled={runWorkflow.isPending}
            onClick={() => void runAction('submit-review', 'Enviado a revisión')}
          >
            <SendIcon className="size-4" />
            Enviar a revisión
          </Button>
        )}
        {hasReviewCycle && inReview && canPublish && (
          <>
            <Button
              size="sm"
              disabled={runWorkflow.isPending}
              onClick={() => void runAction('approve', 'Pieza aprobada y publicada')}
            >
              <CheckIcon className="size-4" />
              Aprobar y publicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={runWorkflow.isPending}
              onClick={() => setConfirm('reject')}
            >
              <XIcon className="size-4" />
              Rechazar
            </Button>
          </>
        )}
        {canPublish &&
          (published ? (
            <Button size="sm" variant="outline" onClick={() => setConfirm('unpublish')}>
              <EyeOffIcon className="size-4" />
              Despublicar
            </Button>
          ) : (
            // Atajo del admin que edita y publica de una; el camino con revisión
            // es enviar a revisión y aprobar.
            !inReview && (
              <Button size="sm" onClick={() => setConfirm('publish')} disabled={!exists}>
                <SendIcon className="size-4" />
                Publicar
              </Button>
            )
          ))}
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar {PIECE_LABEL[piece]} con IA</DialogTitle>
            <DialogDescription>
              El resultado entra como borrador y reemplaza lo que haya sin publicar.
            </DialogDescription>
          </DialogHeader>
          {withCount && (
            <Field>
              <FieldLabel htmlFor="ai-card-count">Cantidad de tarjetas</FieldLabel>
              <Input
                id="ai-card-count"
                type="number"
                min={1}
                max={30}
                value={count}
                onChange={(e) => setCount(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
              />
              <FieldDescription>Entre 1 y 30.</FieldDescription>
            </Field>
          )}
          <DialogFooter>
            <Button onClick={generate} disabled={generateWithAi.isPending}>
              {generateWithAi.isPending ? 'Generando…' : 'Generar borrador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => setConfirm(open ? confirm : null)}
        title={CONFIRM_TITLE[confirm ?? 'publish']}
        description={confirmDescription(confirm, PIECE_LABEL[piece])}
        destructive={confirm !== 'publish'}
        // El motivo del rechazo va al audit log: es lo que el editor lee para
        // saber qué corregir.
        requireReason={confirm === 'reject'}
        confirmLabel={CONFIRM_LABEL[confirm ?? 'publish']}
        onConfirm={async ({ reason }) => {
          if (confirm === 'reject') {
            await runWorkflow.mutateAsync({ piece, action: 'reject', reason });
            toast.success('Devuelto a borrador');
            setConfirm(null);
            return;
          }
          await togglePublished(confirm === 'publish');
        }}
      />
    </div>
  );
}
