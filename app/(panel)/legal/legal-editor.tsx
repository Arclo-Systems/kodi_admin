'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import {
  useLegalDocument,
  useUpdateLegalDocument,
  type LegalDoc,
  type LegalDocument,
  type LegalSection,
} from '@/hooks/use-legal';

const DOC_LABELS: Record<LegalDoc, string> = {
  terms: 'Términos de uso',
  privacy: 'Política de privacidad',
};

export function LegalEditor({ doc }: { doc: LegalDoc }) {
  const { data, isLoading } = useLegalDocument(doc);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  // key: el editor arranca del texto cargado; si la query se refresca (guardado),
  // se remonta con la versión nueva en vez de quedar con el borrador viejo.
  return <SectionsForm key={`${doc}:${data.version}`} doc={doc} document={data} />;
}

function SectionsForm({ doc, document }: { doc: LegalDoc; document: LegalDocument }) {
  const update = useUpdateLegalDocument(doc);
  const [sections, setSections] = useState<LegalSection[]>(document.sections);
  const [confirming, setConfirming] = useState(false);

  function patch(index: number, field: keyof LegalSection, value: string): void {
    setSections((prev) =>
      prev.map((section, i) => (i === index ? { ...section, [field]: value } : section)),
    );
  }

  function add(): void {
    setSections((prev) => [...prev, { title: '', body: '' }]);
  }

  function remove(index: number): void {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  // Un solo move con delta: subir en la primera o bajar en la última no hace nada,
  // y los botones ya vienen deshabilitados en esos bordes.
  function move(index: number, delta: number): void {
    setSections((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(target, 0, moved);
      return next;
    });
  }

  const incomplete = sections.some((s) => !s.title.trim() || !s.body.trim());
  const dirty = !sameSections(document.sections, sections);
  const canSave = sections.length > 0 && !incomplete && dirty;

  async function save(): Promise<void> {
    await update.mutateAsync(
      sections.map((s) => ({ title: s.title.trim(), body: s.body.trim() })),
      {
        onSuccess: () => toast.success('Documento publicado'),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">Versión {document.version}</Badge>
          <span>
            {sections.length} {sections.length === 1 ? 'sección' : 'secciones'}
          </span>
          {document.updatedAt && (
            <span>· Última edición {new Date(document.updatedAt).toLocaleDateString('es-CR')}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={add}>
            <PlusIcon className="size-4" />
            Agregar sección
          </Button>
          <Button size="sm" disabled={!canSave || update.isPending} onClick={() => setConfirming(true)}>
            {update.isPending ? 'Publicando…' : 'Publicar'}
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <EmptyState
          message="Sin secciones"
          description="Agregá al menos una sección para poder publicar este documento."
        />
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`legal-title-${index}`}>Título</Label>
                    <Input
                      id={`legal-title-${index}`}
                      value={section.title}
                      maxLength={200}
                      placeholder="1. Aceptación de los términos"
                      onChange={(e) => patch(index, 'title', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-1 pt-7">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Subir sección"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpIcon className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Bajar sección"
                      disabled={index === sections.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownIcon className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar sección"
                      onClick={() => remove(index)}
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`legal-body-${index}`}>Texto</Label>
                  <Textarea
                    id={`legal-body-${index}`}
                    value={section.body}
                    rows={5}
                    maxLength={8000}
                    onChange={(e) => patch(index, 'body', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {incomplete && (
        <p className="text-destructive text-xs">
          Hay secciones sin título o sin texto. Completalas o quitalas para poder publicar.
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Publicar ${DOC_LABELS[doc]}`}
        description="El texto queda visible al instante en la app, la landing y las fichas de las tiendas. Si cambió respecto de lo publicado, sube de versión y los usuarios nuevos aceptarán esta."
        confirmLabel="Publicar"
        onConfirm={save}
      />
    </div>
  );
}

function sameSections(a: LegalSection[], b: LegalSection[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (section, index) =>
        section.title === b[index]?.title.trim() && section.body === b[index]?.body.trim(),
    )
  );
}
