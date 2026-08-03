'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { LayersIcon, PercentIcon, SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import {
  useUniversity,
  useUniversityMutations,
  type University,
  type UniversityInput,
} from '@/hooks/use-universities';
import { useModulesTree } from '@/hooks/use-modules-tree';

// Radix Select no admite value vacío — sentinel del repo para "sin asignar".
const NO_EXAM = 'NONE';

type FormValues = {
  country: string;
  code: string;
  name: string;
  examWeight: string;
  presentationWeight: string;
  scaleMin: string;
  scaleMax: string;
  examSubjectId: string;
  isActive: boolean;
};

function toValues(u: University): FormValues {
  return {
    country: u.country,
    code: u.code,
    name: u.name,
    examWeight: u.examWeight,
    presentationWeight: u.presentationWeight,
    scaleMin: String(u.scaleMin),
    scaleMax: String(u.scaleMax),
    examSubjectId: u.examSubjectId ?? NO_EXAM,
    isActive: u.isActive,
  };
}

function toInput(v: FormValues): UniversityInput {
  return {
    country: v.country,
    code: v.code.trim().toUpperCase(),
    name: v.name.trim(),
    examWeight: Number(v.examWeight),
    presentationWeight: Number(v.presentationWeight),
    scaleMin: Number(v.scaleMin),
    scaleMax: Number(v.scaleMax),
    examSubjectId: v.examSubjectId === NO_EXAM ? null : v.examSubjectId,
    isActive: v.isActive,
  };
}

export function UniversityForm({ universityId }: { universityId?: string }) {
  const { data: detail, isLoading } = useUniversity(universityId ?? '');
  if (universityId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!detail) {
      return <p className="text-muted-foreground text-sm">Universidad no encontrada.</p>;
    }
    return <UniversityFormInner universityId={universityId} initial={toValues(detail)} />;
  }
  return <UniversityFormInner />;
}

function UniversityFormInner({
  universityId,
  initial,
}: {
  universityId?: string;
  initial?: FormValues;
}) {
  const router = useRouter();
  const { create, update } = useUniversityMutations();
  const form = useForm<FormValues>({
    defaultValues:
      initial ?? {
        country: 'CR',
        code: '',
        name: '',
        examWeight: '',
        presentationWeight: '',
        scaleMin: '',
        scaleMax: '',
        examSubjectId: NO_EXAM,
        isActive: true,
      },
  });

  // Opciones del examen: materias de módulos de ADMISIÓN del país elegido —
  // en admisión la materia ES el examen (Ola B, founder #13). El tree por país
  // garantiza que nunca se ofrezcan exámenes ajenos al país del form.
  const country = form.watch('country');
  const treeQ = useModulesTree(country);
  const examOptions = (treeQ.data ?? [])
    .filter((m) => m.examMode === 'admission' && m.country === country)
    .flatMap((m) =>
      m.subjects.map((s) => ({
        id: s.id,
        label: `${m.shortName} · ${s.name}`,
      })),
    );

  // Cambiar de país invalida el examen elegido: sin esto quedaba un id stale
  // que el Select ya no muestra pero el submit sí envía (422 al final).
  const selectedExam = form.watch('examSubjectId');
  useEffect(() => {
    if (
      selectedExam !== NO_EXAM &&
      !treeQ.isLoading &&
      !examOptions.some((o) => o.id === selectedExam)
    ) {
      form.setValue('examSubjectId', NO_EXAM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, treeQ.isLoading]);

  async function submit(v: FormValues): Promise<void> {
    const code = v.code.trim().toUpperCase();
    if (code.length < 2 || code.length > 20) {
      toast.error('El código debe tener entre 2 y 20 caracteres');
      return;
    }
    if (!v.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    const exam = Number(v.examWeight);
    const presentation = Number(v.presentationWeight);
    if (Number.isNaN(exam) || exam < 0 || exam > 1) {
      toast.error('El peso del examen debe estar entre 0 y 1');
      return;
    }
    if (Number.isNaN(presentation) || presentation < 0 || presentation > 1) {
      toast.error('El peso de la presentación debe estar entre 0 y 1');
      return;
    }
    if (Math.abs(exam + presentation - 1) > 1e-6) {
      toast.error('Los pesos deben sumar 1 (ej. 0.6 examen + 0.4 presentación)');
      return;
    }
    const scaleMin = Number(v.scaleMin);
    const scaleMax = Number(v.scaleMax);
    if (!Number.isInteger(scaleMin) || !Number.isInteger(scaleMax)) {
      toast.error('La escala debe ser de números enteros');
      return;
    }
    if (scaleMin >= scaleMax) {
      toast.error('El mínimo de la escala debe ser menor que el máximo');
      return;
    }
    try {
      if (universityId) {
        const patch: Partial<UniversityInput> = toInput(v);
        delete patch.code;
        delete patch.country;
        await update.mutateAsync({ id: universityId, input: patch });
        toast.success('Universidad actualizada');
      } else {
        await create.mutateAsync(toInput(v));
        toast.success('Universidad creada');
      }
      router.push('/content/universities');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando la universidad');
    }
  }

  const isEdit = Boolean(universityId);

  const text = (name: keyof FormValues, label: string, desc?: string, disabled = false) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor={`u-${name}`}>{label}</FieldLabel>
          <Input
            id={`u-${name}`}
            value={field.value as string}
            onChange={field.onChange}
            disabled={disabled}
          />
          {desc && <FieldDescription>{desc}</FieldDescription>}
        </Field>
      )}
    />
  );

  return (
    <Card>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
          <fieldset className="min-w-0 space-y-3">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <LayersIcon className="text-primary size-4" />
              Identificación
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Controller
                name="country"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>País</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
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
              {text(
                'code',
                'Código',
                isEdit
                  ? 'No editable. Para cambiar el código, creá una nueva universidad y desactivá esta.'
                  : 'Ej. UCR — 2 a 20 caracteres, se guarda en mayúsculas. Debe coincidir con la columna «university» del CSV de cortes.',
                isEdit,
              )}
              {text('name', 'Nombre', 'Solo para mostrar; el cruce con los cortes se hace por código.')}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <PercentIcon className="text-primary size-4" />
              Nota de admisión
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {text('examWeight', 'Peso del examen (0–1)', 'Ej. 0.6.')}
              {text(
                'presentationWeight',
                'Peso de la presentación (0–1)',
                'Ambos pesos deben sumar 1.',
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {text('scaleMin', 'Escala mínima', 'Entero, ej. 200.')}
              {text('scaleMax', 'Escala máxima', 'Entero mayor que la mínima, ej. 800.')}
            </div>
            <Controller
              name="examSubjectId"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Examen que usa</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_EXAM}>Sin asignar</SelectItem>
                      {examOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    La proyección de nota de esta universidad se calcula con el
                    desempeño de ESTE examen. Sin asignar = estimado global del
                    módulo (mezcla exámenes).
                  </FieldDescription>
                </Field>
              )}
            />
          </fieldset>

          <Controller
            name="isActive"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="u-active">Estado</FieldLabel>
                <div className="flex items-center gap-2">
                  <Switch id="u-active" checked={field.value} onCheckedChange={field.onChange} />
                  <span className="text-sm">{field.value ? 'Activa' : 'Inactiva'}</span>
                </div>
              </Field>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/content/universities')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              {universityId ? 'Guardar cambios' : 'Crear universidad'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
