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
  DOC_LABELS,
  useLegalDocument,
  useUpdateLegalDocument,
  type LegalDoc,
  type LegalDocument,
  type LegalSection,
} from '@/hooks/use-legal';

// Publicar no significa lo mismo en los tres documentos: la aceptación del
// usuario existe solo para los términos, y las bases no salen en la landing ni
// en las fichas de las tiendas — el aviso de confirmación lo dice por documento.
const DOC_PUBLISH_NOTICE: Record<LegalDoc, string> = {
  terms:
    'El texto queda visible al instante en la app, la landing y las fichas de las tiendas. Si cambió respecto de lo publicado, sube de versión y los usuarios nuevos aceptarán esta.',
  privacy:
    'El texto queda visible al instante en la app, la landing y las fichas de las tiendas. Si cambió respecto de lo publicado, sube de versión.',
  raffle_rules:
    'El texto queda visible al instante en la app, en la pantalla de Premiaciones. Si cambió respecto de lo publicado, sube de versión; los usuarios no tienen que aceptarlo.',
};

// Fecha como la lee el usuario en la app y en la landing ("4 de agosto de 2026"),
// no el formato corto de tabla: la vista previa imita el documento publicado.
const READING_DATE = new Intl.DateTimeFormat('es-CR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Identidad de fila para el editor. Las secciones no tienen id en el backend
 * (son un array posicional), pero al reordenar o borrar el índice deja de
 * identificar a la misma sección: React reusaría el input equivocado y el foco
 * y el cursor saltarían de fila. El id es local y nunca se manda.
 */
type DraftSection = LegalSection & { id: string };

let sequence = 0;
function nextId(): string {
  sequence += 1;
  return `s${sequence}`;
}

export function LegalEditor({ doc, canWrite }: { doc: LegalDoc; canWrite: boolean }) {
  const { data, isLoading } = useLegalDocument(doc);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  // key: el editor arranca del texto cargado; si la query se refresca (guardado),
  // se remonta con la versión nueva en vez de quedar con el borrador viejo.
  return <SectionsForm key={`${doc}:${data.version}`} doc={doc} document={data} canWrite={canWrite} />;
}

function SectionsForm({
  doc,
  document,
  canWrite,
}: {
  doc: LegalDoc;
  document: LegalDocument;
  canWrite: boolean;
}) {
  const update = useUpdateLegalDocument(doc);
  const [sections, setSections] = useState<DraftSection[]>(() =>
    document.sections.map((section) => ({ ...section, id: nextId() })),
  );
  const [confirming, setConfirming] = useState(false);

  function patch(id: string, field: keyof LegalSection, value: string): void {
    setSections((prev) =>
      prev.map((section) => (section.id === id ? { ...section, [field]: value } : section)),
    );
  }

  function add(): void {
    setSections((prev) => [...prev, { id: nextId(), title: '', body: '' }]);
  }

  function remove(id: string): void {
    setSections((prev) => prev.filter((section) => section.id !== id));
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
  const canSave = canWrite && sections.length > 0 && !incomplete && dirty;

  async function save(): Promise<void> {
    await update.mutateAsync(
      {
        sections: sections.map((s) => ({ title: s.title.trim(), body: s.body.trim() })),
        expectedVersion: document.version,
      },
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
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={add}>
              <PlusIcon className="size-4" />
              Agregar sección
            </Button>
            <Button
              size="sm"
              disabled={!canSave || update.isPending}
              onClick={() => setConfirming(true)}
            >
              {update.isPending ? 'Publicando…' : 'Publicar'}
            </Button>
          </div>
        )}
      </div>

      {/* Editar y leer a la vez: el texto legal se revisa como documento corrido,
          no como una pila de campos. En pantallas angostas la vista previa cae
          debajo del editor en vez de competir por el ancho. */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
        <div className="space-y-3">
          {sections.length === 0 ? (
            <EmptyState
              message="Sin secciones"
              description={
                canWrite
                  ? 'Agregá al menos una sección para poder publicar este documento.'
                  : 'Este documento todavía no tiene texto publicado.'
              }
            />
          ) : (
            sections.map((section, index) => (
              <Card key={section.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`legal-title-${section.id}`}>Título</Label>
                      <Input
                        id={`legal-title-${section.id}`}
                        value={section.title}
                        maxLength={200}
                        readOnly={!canWrite}
                        placeholder="1. Título de la sección"
                        onChange={(e) => patch(section.id, 'title', e.target.value)}
                      />
                    </div>
                    {canWrite && (
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
                          onClick={() => remove(section.id)}
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`legal-body-${section.id}`}>Texto</Label>
                    <Textarea
                      id={`legal-body-${section.id}`}
                      value={section.body}
                      rows={5}
                      maxLength={8000}
                      readOnly={!canWrite}
                      onChange={(e) => patch(section.id, 'body', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {incomplete && (
            <p className="text-destructive text-xs">
              Hay secciones sin título o sin texto. Completalas o quitalas para poder publicar.
            </p>
          )}
        </div>

        <DocumentPreview doc={doc} lastUpdated={document.lastUpdated} sections={sections} />
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Publicar ${DOC_LABELS[doc]}`}
        description={DOC_PUBLISH_NOTICE[doc]}
        confirmLabel="Publicar"
        onConfirm={save}
      />
    </div>
  );
}

/**
 * El documento como lo va a leer el usuario: mismo orden de título, fecha y
 * secciones que la app y la landing. Es la única forma de ver el texto corrido
 * (los inputs lo parten en cajas) y de notar una sección fuera de lugar antes
 * de publicar.
 */
function DocumentPreview({
  doc,
  lastUpdated,
  sections,
}: {
  doc: LegalDoc;
  lastUpdated: string;
  sections: DraftSection[];
}) {
  const publicado = new Date(lastUpdated);

  return (
    <Card className="xl:sticky xl:top-4">
      <CardContent className="max-h-[calc(100vh-8rem)] space-y-6 overflow-y-auto pt-6">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">{DOC_LABELS[doc]}</h2>
          <p className="text-muted-foreground text-xs">
            Última actualización:{' '}
            {Number.isNaN(publicado.getTime()) ? '—' : READING_DATE.format(publicado)}
          </p>
        </header>

        {sections.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">
            La vista previa aparece cuando el documento tiene al menos una sección.
          </p>
        ) : (
          sections.map((section) => (
            <section key={section.id} className="space-y-2">
              <h3 className="text-sm font-semibold">
                {section.title.trim() || (
                  <span className="text-muted-foreground font-normal italic">(sin título)</span>
                )}
              </h3>
              {/* whitespace-pre-line: los saltos de línea que escribe el admin son
                  parte del texto legal y así se publican. */}
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                {section.body.trim() || (
                  <span className="italic">(sin texto)</span>
                )}
              </p>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// Compara contra lo que realmente se va a mandar: el PUT trimea cada campo, así
// que agregar o quitar espacios al final no es un cambio y no debe habilitar
// "Publicar" (publicar sin cambios no sube de versión, pero sí deja audit log).
function sameSections(a: LegalSection[], b: LegalSection[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (section, index) =>
        section.title.trim() === b[index]?.title.trim() &&
        section.body.trim() === b[index]?.body.trim(),
    )
  );
}
