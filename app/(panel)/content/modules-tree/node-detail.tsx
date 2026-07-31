'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  BookOpenIcon,
  FileTextIcon,
  FolderIcon,
  PlusIcon,
  PowerIcon,
  SaveIcon,
  Trash2Icon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NodeFooter, NodeHeader, NodeTitle } from './node-shell';
import { AssetField, ColorField } from './visual-identity-fields';
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
import { EXAM_MODES, EXAM_MODE_HINTS, EXAM_MODE_LABELS, type ExamMode } from '@/lib/exam-types';
import type { TreeModule, TreeSubject, TreeTopic } from '@/hooks/use-modules-tree';
import { useContentTreeMutations } from '@/hooks/use-content-tree-mutations';

export type TreeView =
  | { kind: 'module'; id: string }
  | { kind: 'subject'; id: string; moduleId: string }
  | { kind: 'topic'; id: string; subjectId: string }
  | { kind: 'new-module' }
  | { kind: 'new-subject'; moduleId: string }
  | { kind: 'new-topic'; subjectId: string }
  | null;

const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

function findSubject(tree: TreeModule[], id: string): TreeSubject | undefined {
  for (const m of tree) {
    const s = m.subjects.find((x) => x.id === id);
    if (s) return s;
  }
}
function findTopic(tree: TreeModule[], id: string): TreeTopic | undefined {
  for (const m of tree)
    for (const s of m.subjects) {
      const t = s.topics.find((x) => x.id === id);
      if (t) return t;
    }
}
function findModuleOfSubject(tree: TreeModule[], subjectId: string): TreeModule | undefined {
  return tree.find((m) => m.subjects.some((s) => s.id === subjectId));
}

function NodeNotFound({ tipo }: { tipo: string }) {
  return (
    <div className="space-y-3 py-6 text-center">
      <p className="text-sm font-medium">{tipo} ya no existe</p>
      <p className="text-muted-foreground text-sm">
        Puede que alguien la haya eliminado, o que el enlace sea viejo.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/content/modules-tree">Volver al árbol</Link>
      </Button>
    </div>
  );
}

function DeleteButton({
  label,
  title,
  description,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon className="size-4" /> {label}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        destructive
        confirmLabel="Eliminar"
        onConfirm={onConfirm}
      />
    </>
  );
}

export function NodeDetail({
  view,
  tree,
  canWriteModules,
  onDone,
}: {
  view: TreeView;
  tree: TreeModule[];
  canWriteModules: boolean;
  onDone: () => void;
}) {
  if (!view) return null;
  if (view.kind === 'module' || view.kind === 'new-module') {
    return <ModuleForm view={view} tree={tree} canWriteModules={canWriteModules} onDone={onDone} />;
  }
  if (view.kind === 'subject' || view.kind === 'new-subject') {
    return <SubjectForm view={view} tree={tree} onDone={onDone} />;
  }
  return <TopicForm view={view} tree={tree} onDone={onDone} />;
}

// ─── Módulo ──────────────────────────────────────────────────────────────────
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
  /** Vacío = sin definir (el backend recibe null). */
  examDurationMin: string;
  examQuestionCount: string;
};

function ModuleForm({
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

      {/* Tres bloques en paralelo: qué examen es, cómo se calcula, y cómo se ve.
          Antes eran dos columnas porque esto vivía en un diálogo; en pantalla
          completa el arte entra al lado en vez de apilarse al final. */}
      <div className="grid gap-x-6 gap-y-4 py-4 sm:grid-cols-2 xl:grid-cols-3">
        {isNew && (
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
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

        {/* Columna propia: el arte necesita espacio para los previews. Va última
            en el orden de lectura (qué examen es → cómo se calcula → cómo se ve),
            y se ordena por CSS en vez de mover el bloque porque la columna de
            configuración es condicional. */}
        <div className="order-last space-y-4 sm:col-span-2 sm:border-t sm:pt-4 xl:col-span-1 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
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

        {!isNew && (
          <div className="space-y-4 sm:border-l sm:pl-6">
            <p className="text-sm font-medium">Configuración del módulo</p>
            {isAdmission && (
              <p className="text-muted-foreground text-xs">
                Examen de admisión: no se aprueba ni se reprueba, se compite
                contra la cohorte. Por eso no lleva nota para aprobar.
              </p>
            )}

            <Controller
              name="duelCategorySource"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Tablero de Partida Kodi</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subjects">Por materias</SelectItem>
                      <SelectItem value="topics">Por temas</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    De qué se arman los sectores de la ruleta y las coronas que
                    se ganan.
                  </p>
                </Field>
              )}
            />

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
                      <FieldLabel>Nota para aprobar (%)</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </Field>
                  )}
                />
              )}
              <Controller
                name="noRepeatWindowQuestions"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>No repetir últimas N</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      max={500}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                    <p className="text-muted-foreground text-xs">
                      0 = sin margen.
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
                    <FieldLabel>Duración del examen (min)</FieldLabel>
                    <Input type="number" min={1} max={600} placeholder="Sin definir" {...field} />
                  </Field>
                )}
              />
              <Controller
                name="examQuestionCount"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Preguntas del examen</FieldLabel>
                    <Input type="number" min={1} placeholder="Sin definir" {...field} />
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
            {canWriteModules && <DuplicateModule id={existing.id} />}
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

function DuplicateModule({ id }: { id: string }) {
  const m = useContentTreeMutations();
  return (
    <Select
      onValueChange={(country) =>
        m.duplicateModule.mutate(
          { id, targetCountry: country },
          {
            onSuccess: () => toast.success(`Duplicado a ${country} (inactivo)`),
            onError: (e: Error) => toast.error(e.message),
          },
        )
      }
    >
      <SelectTrigger className="w-44">
        <SelectValue placeholder="Duplicar a país…" />
      </SelectTrigger>
      <SelectContent>
        {COUNTRIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.code} · {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Materia ─────────────────────────────────────────────────────────────────
type SubjectValues = {
  name: string;
  shortName: string;
  colorHex: string;
  region: string;
  assetUrl: string | null;
  wheelAssetUrl: string | null;
};

function SubjectForm({
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
    try {
      if (view.kind === 'new-subject') {
        await m.createSubject.mutateAsync({
          moduleId: view.moduleId,
          name: v.name,
          shortName: v.shortName,
          colorHex: v.colorHex,
          region: v.region || null,
          assetUrl: v.assetUrl,
          wheelAssetUrl: v.wheelAssetUrl,
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
          wheelAssetUrl: v.wheelAssetUrl,
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

// ─── Tema ────────────────────────────────────────────────────────────────────
type TopicValues = {
  name: string;
  examWeight: string;
  /** `null` = sin identidad propia. La ruleta depende de ese null para caer a
   *  su color de respaldo por posición, así que no se rellena con un default. */
  colorHex: string | null;
  /** Solo arte de ruleta: en práctica se muestra la materia, no el tema. */
  wheelAssetUrl: string | null;
};

function TopicForm({
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
