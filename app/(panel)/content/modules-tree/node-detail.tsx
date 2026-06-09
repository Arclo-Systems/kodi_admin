'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  examType: string;
  shortName: string;
  fullName: string;
  version: string;
  hasAdmissionCutoffs: boolean;
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
      examType: '',
      shortName: existing?.shortName ?? '',
      fullName: existing?.fullName ?? '',
      version: '1',
      hasAdmissionCutoffs: false,
    },
  });
  useEffect(() => {
    if (existing)
      form.reset({ ...form.getValues(), shortName: existing.shortName, fullName: existing.fullName });
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
          version: v.version,
          hasAdmissionCutoffs: v.hasAdmissionCutoffs,
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
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <BookOpenIcon className="text-primary size-5" />
          {isNew ? 'Nuevo módulo' : 'Editar módulo'}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4">
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
            <Controller
              name="examType"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Tipo de examen</FieldLabel>
                  <Input {...field} placeholder="paa" />
                </Field>
              )}
            />
          </div>
        )}
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

      <DialogFooter>
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
      </DialogFooter>

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
type SubjectValues = { name: string; shortName: string; colorHex: string; region: string };

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
      colorHex: '#3b82f6',
      region: '',
    },
  });

  async function submit(v: SubjectValues): Promise<void> {
    try {
      if (view.kind === 'new-subject') {
        await m.createSubject.mutateAsync({
          moduleId: view.moduleId,
          name: v.name,
          shortName: v.shortName,
          colorHex: v.colorHex,
          region: v.region || null,
        });
        toast.success('Materia creada');
      } else {
        await m.updateSubject.mutateAsync({ id: view.id, name: v.name });
        toast.success('Materia actualizada');
      }
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FolderIcon className="text-primary size-5" />
          {isNew ? 'Nueva materia' : 'Editar materia'}
        </DialogTitle>
      </DialogHeader>

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
          <>
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
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="colorHex"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Color</FieldLabel>
                    <Input type="color" {...field} className="h-9 w-full" />
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
          </>
        )}
      </div>

      <DialogFooter className="sm:justify-between">
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
      </DialogFooter>
    </form>
  );
}

// ─── Tema ────────────────────────────────────────────────────────────────────
type TopicValues = { name: string; examWeight: string };

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

  const form = useForm<TopicValues>({
    defaultValues: {
      name: existing?.name ?? '',
      examWeight: existing?.examWeight != null ? String(existing.examWeight) : '',
    },
  });

  async function submit(v: TopicValues): Promise<void> {
    const examWeight = v.examWeight === '' ? null : Number(v.examWeight);
    try {
      if (view.kind === 'new-topic') {
        await m.createTopic.mutateAsync({ subjectId: view.subjectId, name: v.name, examWeight });
        toast.success('Tema creado');
      } else {
        await m.updateTopic.mutateAsync({ id: view.id, name: v.name, examWeight });
        toast.success('Tema actualizado');
      }
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileTextIcon className="text-primary size-5" />
          {isNew ? 'Nuevo tema' : 'Editar tema'}
        </DialogTitle>
      </DialogHeader>

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
      </div>

      <DialogFooter className="sm:justify-between">
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
      </DialogFooter>
    </form>
  );
}
