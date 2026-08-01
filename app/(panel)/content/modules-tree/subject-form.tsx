'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FolderIcon, PlusIcon, SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { TreeModule } from '@/hooks/use-modules-tree';
import { useContentTreeMutations } from '@/hooks/use-content-tree-mutations';
import { NodeFooter, NodeHeader, NodeTitle } from './node-shell';
import { AssetField, ColorField } from './visual-identity-fields';
import { DeleteButton, NodeNotFound, findSubject } from './node-shared';

type SubjectValues = {
  name: string;
  shortName: string;
  colorHex: string;
  region: string;
  assetUrl: string | null;
  wheelAssetUrl: string | null;
};

export function SubjectForm({
  view,
  tree,
  onDone,
}: {
  view: { kind: 'subject'; id: string; moduleId: string } | { kind: 'new-subject'; moduleId: string };
  tree: TreeModule[];
  onDone: () => void;
}) {
  const m = useContentTreeMutations();
  const isNew = view.kind === 'new-subject';
  const existing = view.kind === 'subject' ? findSubject(tree, view.id) : undefined;

  // El arte de ruleta se pide donde la ruleta lo usa, y eso lo decide de qué se
  // arma el tablero — NO cómo se califica el módulo. Mirando `examMode` la PAA
  // quedaba sin poder cargar el arte que su ruleta sí está usando: arma por
  // materias aunque sea de admisión.
  const usaMaterias =
    tree.find((x) => x.id === view.moduleId)?.duelCategorySource === 'subjects';

  const form = useForm<SubjectValues>({
    defaultValues: {
      name: existing?.name ?? '',
      shortName: '',
      colorHex: existing?.colorHex ?? '#408D99',
      region: '',
      assetUrl: existing?.assetUrl ?? null,
      wheelAssetUrl: existing?.wheelAssetUrl ?? null,
    },
  });

  useEffect(() => {
    if (existing)
      form.reset({
        ...form.getValues(),
        name: existing.name,
        colorHex: existing.colorHex,
        assetUrl: existing.assetUrl,
        wheelAssetUrl: existing.wheelAssetUrl,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  async function submit(v: SubjectValues): Promise<void> {
    // Si el tablero se arma con temas, el campo ni se muestra; mandarlo
    // guardaría arte que la ruleta nunca va a usar.
    const ruleta = usaMaterias ? { wheelAssetUrl: v.wheelAssetUrl } : {};
    try {
      if (view.kind === 'new-subject') {
        await m.createSubject.mutateAsync({
          moduleId: view.moduleId,
          name: v.name,
          shortName: v.shortName,
          colorHex: v.colorHex,
          region: v.region || null,
          assetUrl: v.assetUrl,
          ...ruleta,
        });
        toast.success('Materia creada');
      } else {
        // `shortName` y `region` no se mandan: el árbol no los trae, así que no
        // hay con qué precargarlos y enviarlos vacíos los borraría.
        await m.updateSubject.mutateAsync({
          id: view.id,
          name: v.name,
          colorHex: v.colorHex,
          assetUrl: v.assetUrl,
          ...ruleta,
        });
        toast.success('Materia actualizada');
      }
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // Desde B0 cada nodo tiene URL propia: un link viejo, un nodo que otro admin
  // borró o un fallo al traer el árbol llegaban acá y pintaban un formulario en
  // blanco sin decir por qué.
  if (!isNew && !existing) return <NodeNotFound tipo="La materia" />;

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <NodeHeader>
        <NodeTitle className="flex items-center gap-2">
          <FolderIcon className="text-primary size-5" />
          {isNew ? 'Nueva materia' : 'Editar materia'}
        </NodeTitle>
      </NodeHeader>

      <div className="space-y-4 py-4">
        <Controller
          name="name"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Nombre</FieldLabel>
              <Input {...field} />
            </Field>
          )}
        />
        {isNew && (
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="shortName"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Nombre corto</FieldLabel>
                  <Input {...field} />
                </Field>
              )}
            />
            <Controller
              name="region"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Región (opcional)</FieldLabel>
                  <Input {...field} />
                </Field>
              )}
            />
          </div>
        )}

        <div className="space-y-4 border-t pt-4">
          <p className="text-sm font-medium">Identidad visual</p>
          <Controller
            name="colorHex"
            control={form.control}
            render={({ field }) => (
              <ColorField
                label="Color de la materia"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="assetUrl"
            control={form.control}
            render={({ field }) => (
              <AssetField
                label="Arte de práctica"
                hint="La ilustración de la materia donde se la muestra completa."
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {usaMaterias ? (
            <Controller
              name="wheelAssetUrl"
              control={form.control}
              render={({ field }) => (
                <AssetField
                  label="Arte de ruleta"
                  hint="Va dentro de un sector de la ruleta de Partida Kodi: tiene que leerse chico y en movimiento."
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          ) : (
            <p className="text-muted-foreground text-xs">
              El tablero de Partida Kodi de este módulo se arma con temas, así
              que el arte de ruleta se carga en el tema y no acá.
            </p>
          )}
        </div>
      </div>

      <NodeFooter className="sm:justify-between">
        <div>
          {view.kind === 'subject' && (
            <DeleteButton
              label="Eliminar"
              title="Eliminar materia"
              description="Solo si no tiene temas ni preguntas."
              onConfirm={async () => {
                await m.deleteSubject.mutateAsync(view.id);
                toast.success('Materia eliminada');
                onDone();
              }}
            />
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit">
            {isNew ? <PlusIcon className="size-4" /> : <SaveIcon className="size-4" />}
            {isNew ? 'Crear' : 'Guardar'}
          </Button>
        </div>
      </NodeFooter>
    </form>
  );
}

