'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  BookOpenIcon,
  PlusIcon,
  PowerIcon,
  SaveIcon,
  Trash2Icon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { COUNTRIES } from '@/lib/countries';
import {
  EXAM_MODES,
  EXAM_MODE_HINTS,
  EXAM_MODE_LABELS,
  type ExamMode,
} from '@/lib/exam-types';
import type { TreeModule } from '@/hooks/use-modules-tree';
import { useContentTreeMutations } from '@/hooks/use-content-tree-mutations';
import { NodeFooter, NodeHeader, NodeTitle } from './node-shell';
import { AssetField, ColorField } from './visual-identity-fields';

const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

type ModuleValues = {
  country: string;
  /** Nombre del examen en su país. Identidad, no comportamiento. */
  examType: string;
  /** Cómo se califica. De esto cuelgan predictor y estadísticas. */
  examMode: ExamMode;
  shortName: string;
  fullName: string;
  /** Identidad visual: antes vivía en mapas literales de la app. */
  colorHex: string;
  iconUrl: string | null;
  /** Personaje ESTÁTICO (card hero y tarjeta de compartir). Las caras animadas
   *  siguen dentro de la app y su set se elige por `examMode`. */
  characterUrl: string | null;
  version: string;
  hasAdmissionCutoffs: boolean;
  approvalThreshold: number;
  noRepeatWindowQuestions: number;
  duelCategorySource: 'subjects' | 'topics';
  /** Máximo de sectores de la ruleta. Si hay menos categorías, se usan todas. */
  duelCategoryCap: number;
  /** Vacío = sin definir (el backend recibe null). */
  examDurationMin: string;
  examQuestionCount: string;
};

export function ModuleForm({
  view,
  tree,
  canWriteModules,
  onDone,
}: {
  view: { kind: 'module'; id: string } | { kind: 'new-module' };
  tree: TreeModule[];
  canWriteModules: boolean;
  onDone: () => void;
}) {
  const m = useContentTreeMutations();
  const isNew = view.kind === 'new-module';
  const [confirmDelete, setConfirmDelete] = useState(false);
  const existing = view.kind === 'module' ? tree.find((x) => x.id === view.id) : undefined;
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const form = useForm<ModuleValues>({
    defaultValues: {
      country: COUNTRY_CODES[0] ?? 'CR',
      examType: existing?.examType ?? '',
      examMode: existing?.examMode ?? 'simple',
      shortName: existing?.shortName ?? '',
      fullName: existing?.fullName ?? '',
      colorHex: existing?.colorHex ?? '#408D99',
      iconUrl: existing?.iconUrl ?? null,
      characterUrl: existing?.characterUrl ?? null,
      version: existing?.version ?? '1',
      hasAdmissionCutoffs: existing?.hasAdmissionCutoffs ?? false,
      approvalThreshold: existing?.approvalThreshold ?? 70,
      noRepeatWindowQuestions: existing?.noRepeatWindowQuestions ?? 50,
      duelCategorySource: existing?.duelCategorySource ?? 'subjects',
      duelCategoryCap: existing?.duelCategoryCap ?? 6,
      examDurationMin: existing?.examDurationMin?.toString() ?? '',
      examQuestionCount: existing?.examQuestionCount?.toString() ?? '',
    },
  });
  // Los exámenes de admisión no se aprueban ni se reprueban, así que su nota
  // mínima no aplica. Sale del campo declarado, ya no de adivinar el nombre.
  const isAdmission =
    useWatch({ control: form.control, name: 'examMode' }) === 'admission';

  useEffect(() => {
    if (existing)
      form.reset({
        ...form.getValues(),
        shortName: existing.shortName,
        fullName: existing.fullName,
        colorHex: existing.colorHex,
        iconUrl: existing.iconUrl,
        characterUrl: existing.characterUrl,
        examType: existing.examType,
        examMode: existing.examMode,
        version: existing.version,
        hasAdmissionCutoffs: existing.hasAdmissionCutoffs,
        approvalThreshold: existing.approvalThreshold,
        noRepeatWindowQuestions: existing.noRepeatWindowQuestions,
        duelCategorySource: existing.duelCategorySource,
        duelCategoryCap: existing.duelCategoryCap,
        examDurationMin: existing.examDurationMin?.toString() ?? '',
        examQuestionCount: existing.examQuestionCount?.toString() ?? '',
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  async function submit(v: ModuleValues): Promise<void> {
    try {
      if (view.kind === 'new-module') {
        await m.createModule.mutateAsync({ ...v });
        toast.success('Módulo creado (inactivo)');
      } else {
        await m.updateModule.mutateAsync({
          id: view.id,
          shortName: v.shortName,
          fullName: v.fullName,
          colorHex: v.colorHex,
          iconUrl: v.iconUrl,
          characterUrl: v.characterUrl,
          examType: v.examType,
          examMode: v.examMode,
          version: v.version,
          hasAdmissionCutoffs: v.hasAdmissionCutoffs,
          approvalThreshold: v.approvalThreshold,
          noRepeatWindowQuestions: v.noRepeatWindowQuestions,
          duelCategorySource: v.duelCategorySource,
          duelCategoryCap: v.duelCategoryCap,
          // Vacío = sin definir; el simulacro cae a sus valores por defecto.
          // Se recorta antes: Number(' ') da 0, y el backend exige mínimo 1.
          examDurationMin: v.examDurationMin.trim() === '' ? null : Number(v.examDurationMin),
          examQuestionCount:
            v.examQuestionCount.trim() === '' ? null : Number(v.examQuestionCount),
        });
        toast.success('Módulo actualizado');
      }
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!isNew && !existing) return null;

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <NodeHeader>
        <NodeTitle className="flex items-center gap-2">
          <BookOpenIcon className="text-primary size-5" />
          {isNew ? 'Nuevo módulo' : 'Editar módulo'}
        </NodeTitle>
      </NodeHeader>

      {/* Dos columnas de ancho contenido, no inputs estirados a todo el monitor
          (DESIGN.md L4). A la izquierda tres secciones tituladas —qué examen es,
          cómo se califica, y cómo se juega—; a la derecha el arte, que necesita
          alto para los previews. */}
      <div className="grid gap-x-8 gap-y-6 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-6">
        {isNew && (
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="country"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>País</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} · {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>
        )}

        <div className="space-y-4">
        <p className="text-sm font-medium">Identidad del examen</p>
        <Controller
          name="examType"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Nombre del examen</FieldLabel>
              <Input {...field} placeholder="cosevi_auto, paa, …" />
              <p className="text-muted-foreground text-xs">
                Cómo se llama en su país. Único por país; no afecta cálculos.
              </p>
            </Field>
          )}
        />
        <Controller
          name="examMode"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>¿Cómo se califica?</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {EXAM_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {EXAM_MODE_HINTS[field.value]}
              </p>
            </Field>
          )}
        />
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
          name="fullName"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Nombre completo</FieldLabel>
              <Input {...field} />
            </Field>
          )}
        />
        <Controller
          name="version"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Versión</FieldLabel>
              <Input {...field} className="w-32" />
            </Field>
          )}
        />
        <Controller
          name="hasAdmissionCutoffs"
          control={form.control}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} />
              Tiene cortes de admisión
            </label>
          )}
        />

        </div>
        {!isNew && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-medium">Configuración del examen</p>
            {isAdmission && (
              <p className="text-muted-foreground text-xs">
                Examen de admisión: no se aprueba ni se reprueba, se compite
                contra la cohorte. Por eso no lleva nota mínima.
              </p>
            )}

            {/* Filas compartidas (etiqueta / campo / ayuda) con subgrid: si una
                etiqueta ocupa dos líneas y la de al lado una, los campos siguen
                alineados y el texto de ayuda no abre huecos. Apoyar el input
                abajo no alcanzaba acá porque hay ayuda debajo del campo. */}
            <div className="grid grid-cols-2 grid-rows-[auto_auto_auto] gap-x-3 gap-y-2 [&>*]:row-span-3 [&>*]:grid [&>*]:grid-rows-subgrid [&>*]:gap-y-2">
              {/* Los exámenes de admisión (PAA, TEC) no se aprueban ni se
                  reprueban: se compite contra la cohorte. El backend ya los
                  trata así —predictor y estadísticas devuelven la nota en
                  nulo—, así que mostrar el campo solo confundía. */}
              {!isAdmission && (
                <Controller
                  name="approvalThreshold"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      {/* Etiquetas cortas y el detalle en la ayuda: en dos
                          columnas, una etiqueta de dos líneas desalinea el
                          campo de al lado. */}
                      <FieldLabel>Nota mínima</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                      <p className="text-muted-foreground text-xs">
                        % para dar el examen por aprobado.
                      </p>
                    </Field>
                  )}
                />
              )}
              <Controller
                name="noRepeatWindowQuestions"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>No repetir</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      max={500}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                    <p className="text-muted-foreground text-xs">
                      Últimas N respondidas. 0 = sin margen.
                    </p>
                  </Field>
                )}
              />
              {/* `justify-between` apoya el input abajo de la celda: si una
                  etiqueta ocupa dos líneas y la de al lado una, los campos
                  siguen alineados en vez de quedar escalonados. */}
              <Controller
                name="examDurationMin"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Duración</FieldLabel>
                    <Input type="number" min={1} max={600} placeholder="Sin definir" {...field} />
                    <p className="text-muted-foreground text-xs">
                      Minutos del examen real.
                    </p>
                  </Field>
                )}
              />
              <Controller
                name="examQuestionCount"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Preguntas</FieldLabel>
                    <Input type="number" min={1} placeholder="Sin definir" {...field} />
                    <p className="text-muted-foreground text-xs">
                      Cuántas trae el examen real.
                    </p>
                  </Field>
                )}
              />
            </div>
          </div>
        )}

        {!isNew && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-medium">Partida Kodi</p>
            <div className="grid grid-cols-2 grid-rows-[auto_auto_auto] gap-x-3 gap-y-2 [&>*]:row-span-3 [&>*]:grid [&>*]:grid-rows-subgrid [&>*]:gap-y-2">
              <Controller
                name="duelCategorySource"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Se arma con</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subjects">Materias</SelectItem>
                        <SelectItem value="topics">Temas</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs">
                      De qué se arman los sectores de la ruleta.
                    </p>
                  </Field>
                )}
              />
              {/* El tope existía en la base y el juego lo usaba, pero el panel
                  nunca lo expuso: quedaba clavado en 6 sin forma de tocarlo. */}
              <Controller
                name="duelCategoryCap"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Máximo de sectores</FieldLabel>
                    <Input
                      type="number"
                      min={2}
                      max={12}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                    <p className="text-muted-foreground text-xs">
                      Si hay menos, se usan todas.
                    </p>
                  </Field>
                )}
              />
            </div>
          </div>
        )}

        {!isNew && existing && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className={existing.isActive ? undefined : 'text-success hover:text-success'}
              onClick={() => {
                if (existing.isActive) {
                  setConfirmDeactivate(true);
                } else {
                  m.toggleModule.mutate(
                    { id: existing.id, isActive: true },
                    { onSuccess: () => toast.success('Activado') },
                  );
                }
              }}
            >
              <PowerIcon className="size-4" />
              {existing.isActive ? 'Desactivar' : 'Activar'}
            </Button>
            <ConfirmDialog
              open={confirmDeactivate}
              onOpenChange={(o) => !o && setConfirmDeactivate(false)}
              destructive
              title="Desactivar módulo"
              description="El módulo dejará de aparecer en la app. Podés reactivarlo después."
              confirmLabel="Desactivar"
              onConfirm={async () => {
                await m.toggleModule.mutateAsync({ id: existing.id, isActive: false });
                toast.success('Desactivado');
              }}
            />
          </div>
        )}
        </div>


                <div className="space-y-4 xl:border-l xl:pl-8">
          <p className="text-sm font-medium">Identidad visual</p>
          <Controller
            name="colorHex"
            control={form.control}
            render={({ field }) => (
              <ColorField
                label="Color del módulo"
                value={field.value}
                onChange={field.onChange}
                hint="Usá un tono de la paleta oficial de Kodi."
              />
            )}
          />
          <Controller
            name="iconUrl"
            control={form.control}
            render={({ field }) => (
              <AssetField
                label="Icono del módulo"
                hint="Se ve en onboarding, planes, perfil e invitaciones."
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="characterUrl"
            control={form.control}
            render={({ field }) => (
              <AssetField
                label="Personaje del módulo"
                hint="Card de práctica y tarjeta de compartir. Las caras animadas de Koko no se suben acá: viajan dentro de la app."
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </div>

      <NodeFooter>
        {!isNew && canWriteModules && (
          <Button
            type="button"
            variant="destructive"
            className="mr-auto"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon className="size-4" />
            Eliminar
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit">
          {isNew ? <PlusIcon className="size-4" /> : <SaveIcon className="size-4" />}
          {isNew ? 'Crear' : 'Guardar'}
        </Button>
      </NodeFooter>

      {view.kind === 'module' && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Eliminar módulo"
          description="Solo se puede eliminar un módulo vacío (sin materias, preguntas ni usuarios registrados)."
          destructive
          confirmLabel="Eliminar"
          onConfirm={async () => {
            try {
              await m.deleteModule.mutateAsync(view.id);
              toast.success('Módulo eliminado');
              onDone();
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      )}
    </form>
  );
}

