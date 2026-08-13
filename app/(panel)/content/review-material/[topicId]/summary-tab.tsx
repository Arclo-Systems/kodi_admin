'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { SaveIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownField, type RichTool } from '@/components/rich-content/markdown-field';
import { RichContent } from '@/components/rich-content/rich-content';
import {
  useReviewMaterialMutations,
  useSummaryVersions,
  useTopicSummary,
} from '@/hooks/use-review-material';
import { PieceActions } from './piece-actions';
import { VersionHistory } from './version-history';

const MAX_LEN = 40000;
// Mismo set que el enunciado de una pregunta, SVG incluido.
const SUMMARY_TOOLS: RichTool[] = ['formula', 'table', 'image', 'mermaid', 'svg'];
const UPLOAD_URL = '/api/admin/content/review-material/upload-image';

export function SummaryTab({ topicId, canPublish }: { topicId: string; canPublish: boolean }) {
  const { data, isLoading, isError, error } = useTopicSummary(topicId);
  const { saveSummary } = useReviewMaterialMutations(topicId);
  const versions = useSummaryVersions(topicId);
  const [content, setContent] = useState('');
  const [seed, setSeed] = useState<string | null>(null);

  // Re-siembra desde lo persistido cuando el servidor cambia (ver flashcards-tab).
  const serverSeed = data ? `${data.id ?? 'nuevo'}:${data.updatedAt ?? ''}` : null;
  if (data && serverSeed !== seed) {
    setSeed(serverSeed);
    setContent(data.content);
  }

  async function save(): Promise<void> {
    if (!content.trim()) {
      toast.error('El resumen está vacío');
      return;
    }
    try {
      await saveSummary.mutateAsync(content);
      toast.success('Resumen guardado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el resumen');
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : 'No se pudo cargar el resumen.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <PieceActions
        topicId={topicId}
        piece="summary"
        state={data?.status ?? 'empty'}
        canPublish={canPublish}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contenido</CardTitle>
          </CardHeader>
          <CardContent>
            <Field>
              <MarkdownField
                id="summary-content"
                value={content}
                onChange={setContent}
                tools={SUMMARY_TOOLS}
                maxLength={MAX_LEN}
                rows={20}
                uploadUrl={UPLOAD_URL}
                ariaLabel="Contenido del resumen"
                placeholder="Resumen del tema para repasar antes del examen"
              />
            </Field>
          </CardContent>
        </Card>

        {/* Preview renderizado al lado, como en el editor de preguntas. */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vista previa</CardTitle>
            </CardHeader>
            <CardContent>
              <RichContent value={content || '_Sin contenido todavía_'} />
            </CardContent>
          </Card>

          <VersionHistory
            topicId={topicId}
            piece="summary"
            isLoading={versions.isLoading}
            entries={(versions.data ?? []).map((v) => ({
              id: v.id,
              version: v.version,
              createdAt: v.createdAt,
              preview: v.content,
            }))}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saveSummary.isPending}>
          <SaveIcon className="size-4" />
          {saveSummary.isPending ? 'Guardando…' : 'Guardar resumen'}
        </Button>
      </div>
    </div>
  );
}
