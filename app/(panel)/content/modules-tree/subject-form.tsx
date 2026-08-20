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
  // null = "sin definir, usá las cifras del módulo". Números, no strings: el
  // backend valida enteros y mandar "60" sería un 422 evitable. Los rangos
  // (1..500 / 1..600) los impone el backend (`subject.dto.ts`, los MISMOS que
  // `module.dto.ts`) y el min/max del input.
  examQuestionCount: number | null;
  examDurationMin: number | null;
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

  // Adenda §10 (ajuste 2026-08-19): donde la materia ES el examen —admisión
  // (UCR / UNA / TEC) y per_subject (PEN)— el conteo y la duración oficiales se
  // cargan acá. En `simple` el examen es el módulo y estos campos no tienen
  // dueño: ni se muestran ni se mandan (mandarlos en null borraría datos que no
  // son de esta pantalla).
  //
  // Es un criterio DISTINTO de `usaMaterias`, que mira `duelCategorySource`:
  // no se reutiliza ninguno para el otro. El guard sobre `undefined` importa:
  // con el árbol sin cargar, `undefined !== 'simple'` mostraría los campos de más.
  const moduloPadre = tree.find((x) => x.id === view.moduleId);
  const materiaEsExamen =
    moduloPadre !== undefined && moduloPadre.examMode !== 'simple';

  const form = useForm<SubjectValues>({
    defaultValues: {
      name: existing?.name ?? '',
      shortName: '',
      colorHex: existing?.colorHex ?? '#408D99',
      region: '',
      assetUrl: existing?.assetUrl ?? null,
      wheelAssetUrl: existing?.wheelAssetUrl ?? null,
      examQuestionCount: existing?.examQuestionCount ?? null,
      examDurationMin: existing?.examDurationMin ?? null,
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
        examQuestionCount: existing.examQuestionCount,
        examDurationMin: existing.examDurationMin,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  async function submit(v: SubjectValues): Promise<void> {
    // Si el tablero se arma con temas, el campo ni se muestra; mandarlo
    // guardaría arte que la ruleta nunca va a usar.
    const ruleta = usaMaterias ? { wheelAssetUrl: v.wheelAssetUrl } : {};
    const examen = materiaEsExamen
      ? {
          examQuestionCount: v.examQuestionCount,
          examDurationMin: v.examDurationMin,
        }
      : {};
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
          ...examen,
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
          ...examen,
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
              {/* `FieldLabel` no asocia con el input (no emite `htmlFor`/`id`):
                  sin `aria-label` el campo queda sin nombre accesible. */}
              <Input aria-label="Nombre" {...field} />
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
                  <Input aria-label="Nombre corto" {...field} />
                </Field>
              )}
            />
            <Controller
              name="region"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Región (opcional)</FieldLabel>
                  <Input aria-label="Región (opcional)" {...field} />
                </Field>
              )}
            />
          </div>
        )}

        {materiaEsExamen && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-medium">Examen</p>
            <p className="text-muted-foreground text-xs">
              En este módulo cada materia es un examen. Si lo dejás vacío, el
              simulacro usa la duración y la cantidad de preguntas del módulo.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="examQuestionCount"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Preguntas</FieldLabel>
                    {/* No se puede usar `{...field}`: el valor es `number | null`
                        y pasar `null` vuelve el input no-controlado. */}
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      placeholder="Sin definir"
                      aria-label="Cantidad de preguntas del examen"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? null : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                    <p className="text-muted-foreground text-xs">
                      Cuántas trae este examen.
                    </p>
                  </Field>
                )}
              />
              <Controller
                name="examDurationMin"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Duración</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      max={600}
                      placeholder="Sin definir"
                      aria-label="Duración del examen en minutos"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? null : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                    <p className="text-muted-foreground text-xs">
                      Minutos de este examen.
                    </p>
                  </Field>
                )}
              />
            </div>
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
          {/* Con los dos artes, apilarlos dejaba el formulario más largo que la
              pantalla; lado a lado entran juntos. Sin ruleta queda un arte solo
              y la nota debajo, que no gana nada en dos columnas. */}
          <div className={usaMaterias ? 'grid grid-cols-2 gap-3' : 'space-y-4'}>
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

