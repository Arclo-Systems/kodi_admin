'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FileTextIcon, PlusIcon, SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { TreeModule } from '@/hooks/use-modules-tree';
import { useContentTreeMutations } from '@/hooks/use-content-tree-mutations';
import { NodeFooter, NodeHeader, NodeTitle } from './node-shell';
import { AssetField, ColorField } from './visual-identity-fields';
import {
  DeleteButton,
  NodeNotFound,
  findModuleOfSubject,
  findTopic,
} from './node-shared';

type TopicValues = {
  name: string;
  examWeight: string;
  /** `null` = sin identidad propia. La ruleta depende de ese null para caer a
   *  su color de respaldo por posición, así que no se rellena con un default. */
  colorHex: string | null;
  /** Solo arte de ruleta: en práctica se muestra la materia, no el tema. */
  wheelAssetUrl: string | null;
};

export function TopicForm({
  view,
  tree,
  onDone,
}: {
  view: { kind: 'topic'; id: string; subjectId: string } | { kind: 'new-topic'; subjectId: string };
  tree: TreeModule[];
  onDone: () => void;
}) {
  const m = useContentTreeMutations();
  const isNew = view.kind === 'new-topic';
  const existing = view.kind === 'topic' ? findTopic(tree, view.id) : undefined;

  // La identidad visual del tema solo aplica en ADMISIÓN: ahí la "materia" es
  // el examen (PAA UCR, TEC) y lo que el estudiante percibe como materia es el
  // tema. Se deriva del modo del módulo, no es un interruptor aparte.
  const parentModule = findModuleOfSubject(tree, view.subjectId);
  const isAdmissionModule = parentModule?.examMode === 'admission';

  const form = useForm<TopicValues>({
    defaultValues: {
      name: existing?.name ?? '',
      examWeight: existing?.examWeight != null ? String(existing.examWeight) : '',
      colorHex: existing?.colorHex ?? null,
      wheelAssetUrl: existing?.wheelAssetUrl ?? null,
    },
  });

  useEffect(() => {
    if (existing)
      form.reset({
        ...form.getValues(),
        name: existing.name,
        examWeight: existing.examWeight != null ? String(existing.examWeight) : '',
        colorHex: existing.colorHex,
        wheelAssetUrl: existing.wheelAssetUrl,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  async function submit(v: TopicValues): Promise<void> {
    const examWeight = v.examWeight === '' ? null : Number(v.examWeight);
    // Fuera de admisión los campos ni se muestran; mandarlos escribiría arte que
    // la app nunca va a usar.
    // Vaciar el campo de color vuelve a `null`, que es como se le devuelve al
    // tema su falta de identidad propia.
    const visuals = isAdmissionModule
      ? { colorHex: v.colorHex || null, wheelAssetUrl: v.wheelAssetUrl }
      : {};
    try {
      if (view.kind === 'new-topic') {
        await m.createTopic.mutateAsync({
          subjectId: view.subjectId,
          name: v.name,
          examWeight,
          ...visuals,
        });
        toast.success('Tema creado');
      } else {
        await m.updateTopic.mutateAsync({ id: view.id, name: v.name, examWeight, ...visuals });
        toast.success('Tema actualizado');
      }
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!isNew && !existing) return <NodeNotFound tipo="El tema" />;

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <NodeHeader>
        <NodeTitle className="flex items-center gap-2">
          <FileTextIcon className="text-primary size-5" />
          {isNew ? 'Nuevo tema' : 'Editar tema'}
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
        <Controller
          name="examWeight"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Peso en examen (opcional)</FieldLabel>
              <Input type="number" step="0.01" min="0" {...field} className="w-40" />
            </Field>
          )}
        />

        {isAdmissionModule && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-medium">Identidad visual</p>
            <p className="text-muted-foreground text-xs">
              Este módulo es de admisión: acá la materia es el examen, así que el
              arte va en el tema, que es lo que el estudiante percibe como materia.
            </p>
            <Controller
              name="colorHex"
              control={form.control}
              render={({ field }) => (
                <ColorField
                  label="Color del tema"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {/* El tema NO lleva arte de práctica: en práctica se muestra la
                materia (que en admisión es el examen). Su arte propio solo
                aparece en la ruleta de Partida Kodi. */}
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
          </div>
        )}
      </div>

      <NodeFooter className="sm:justify-between">
        <div>
          {view.kind === 'topic' && (
            <DeleteButton
              label="Eliminar"
              title="Eliminar tema"
              description="Solo si no tiene preguntas."
              onConfirm={async () => {
                await m.deleteTopic.mutateAsync(view.id);
                toast.success('Tema eliminado');
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
