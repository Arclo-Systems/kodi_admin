'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { EyeOffIcon, SendIcon, SparklesIcon } from 'lucide-react';
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
  const { generateWithAi, setPublished } = useReviewMaterialMutations(topicId);
  const [aiOpen, setAiOpen] = useState(false);
  const [count, setCount] = useState(10);
  const [confirm, setConfirm] = useState<'publish' | 'unpublish' | null>(null);

  const published = state === 'published';
  const exists = state !== 'empty';

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
        {canPublish &&
          (published ? (
            <Button size="sm" variant="outline" onClick={() => setConfirm('unpublish')}>
              <EyeOffIcon className="size-4" />
              Despublicar
            </Button>
          ) : (
            <Button size="sm" onClick={() => setConfirm('publish')} disabled={!exists}>
              <SendIcon className="size-4" />
              Publicar
            </Button>
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
        title={confirm === 'unpublish' ? 'Despublicar pieza' : 'Publicar pieza'}
        description={
          confirm === 'unpublish'
            ? `Los usuarios dejan de ver ${PIECE_LABEL[piece]} de este tema.`
            : `${PIECE_LABEL[piece]} de este tema queda visible para los usuarios con acceso.`
        }
        destructive={confirm === 'unpublish'}
        confirmLabel={confirm === 'unpublish' ? 'Despublicar' : 'Publicar'}
        onConfirm={() => togglePublished(confirm === 'publish')}
      />
    </div>
  );
}
