'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/admin/empty-state';
import { MarkdownField, type RichTool } from '@/components/rich-content/markdown-field';
import { RichContent } from '@/components/rich-content/rich-content';
import { moveItem } from '@/lib/reorder';
import {
  useFlashcardDeck,
  useReviewMaterialMutations,
  type FlashcardInput,
} from '@/hooks/use-review-material';
import { PieceActions } from './piece-actions';
import { FlashcardsImportDialog } from './flashcards-import-dialog';

const MAX_LEN = 40000;
// El mismo set que el enunciado de una pregunta: una tarjeta puede necesitar
// exactamente lo mismo (fórmula, tabla, imagen, diagrama, figura SVG).
const CARD_TOOLS: RichTool[] = ['formula', 'table', 'image', 'mermaid', 'svg'];
const UPLOAD_URL = '/api/admin/content/review-material/upload-image';
const emptyCard = (): FlashcardInput => ({ front: '', back: '' });

export function FlashcardsTab({
  topicId,
  canPublish,
}: {
  topicId: string;
  canPublish: boolean;
}) {
  const { data, isLoading, isError, error } = useFlashcardDeck(topicId);
  const { saveFlashcards } = useReviewMaterialMutations(topicId);
  const [cards, setCards] = useState<FlashcardInput[]>([]);
  const [flipped, setFlipped] = useState<number | null>(null);
  const [seed, setSeed] = useState<string | null>(null);

  // El deck persistido es la fuente: cada vez que cambia en el servidor (carga,
  // guardado, generación con IA) el editor se re-siembra. Se ajusta durante el
  // render y no en un efecto, para no encadenar un render extra por cada fetch.
  const serverSeed = data ? `${data.id ?? 'nuevo'}:${data.updatedAt ?? ''}` : null;
  if (data && serverSeed !== seed) {
    setSeed(serverSeed);
    setCards(data.cards.map((c) => ({ id: c.id, front: c.front, back: c.back })));
  }

  function update(index: number, patch: Partial<FlashcardInput>): void {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function move(index: number, delta: number): void {
    setCards((prev) => moveItem(prev, index, delta));
  }

  async function save(): Promise<void> {
    const incomplete = cards.some((c) => !c.front.trim() || !c.back.trim());
    if (incomplete) {
      toast.error('Hay tarjetas con el frente o el dorso vacío');
      return;
    }
    try {
      await saveFlashcards.mutateAsync(cards);
      toast.success(`${cards.length} tarjetas guardadas`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudieron guardar las tarjetas');
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : 'No se pudo cargar el mazo.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <PieceActions
        topicId={topicId}
        piece="flashcards"
        state={data?.status ?? 'empty'}
        canPublish={canPublish}
        withCount
      />

      {cards.length === 0 && (
        <EmptyState
          message="Este tema todavía no tiene tarjetas"
          description="Agregá la primera a mano o pedí un borrador con IA."
        />
      )}

      <div className="space-y-4">
        {cards.map((card, index) => (
          <Card key={card.id ?? `nueva-${index}`}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-sm">Tarjeta {index + 1}</CardTitle>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Subir tarjeta"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUpIcon className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Bajar tarjeta"
                  disabled={index === cards.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDownIcon className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Quitar tarjeta"
                  onClick={() => setCards((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2Icon className="text-destructive size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1fr_20rem]">
              <div className="space-y-3">
                <Field>
                  <FieldLabel htmlFor={`front-${index}`}>Frente</FieldLabel>
                  <MarkdownField
                    id={`front-${index}`}
                    value={card.front}
                    onChange={(v) => update(index, { front: v })}
                    tools={CARD_TOOLS}
                    uploadUrl={UPLOAD_URL}
                    maxLength={MAX_LEN}
                    rows={3}
                    placeholder="La pregunta o el concepto"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`back-${index}`}>Dorso</FieldLabel>
                  <MarkdownField
                    id={`back-${index}`}
                    value={card.back}
                    onChange={(v) => update(index, { back: v })}
                    tools={CARD_TOOLS}
                    uploadUrl={UPLOAD_URL}
                    maxLength={MAX_LEN}
                    rows={3}
                    placeholder="La respuesta, en una o dos frases"
                  />
                </Field>
              </div>

              {/* Vista previa como tarjeta: nada se publica a ciegas. */}
              <div className="space-y-2">
                <div className="bg-muted/40 flex aspect-[3/2] items-center justify-center overflow-auto rounded-xl border p-4">
                  <RichContent
                    value={
                      (flipped === index ? card.back : card.front) || '_Sin contenido todavía_'
                    }
                    className="text-center"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setFlipped(flipped === index ? null : index)}
                >
                  <RefreshCwIcon className="size-4" />
                  {flipped === index ? 'Ver el frente' : 'Dar vuelta'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setCards((prev) => [...prev, emptyCard()])}>
            <PlusIcon className="size-4" />
            Agregar tarjeta
          </Button>
          <FlashcardsImportDialog topicId={topicId} />
        </div>
        <Button onClick={save} disabled={saveFlashcards.isPending}>
          <SaveIcon className="size-4" />
          {saveFlashcards.isPending ? 'Guardando…' : 'Guardar mazo'}
        </Button>
      </div>
    </div>
  );
}
