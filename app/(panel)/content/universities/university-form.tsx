'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { LayersIcon, MegaphoneIcon, PercentIcon, SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
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
import { UNIVERSITY_TYPE_LABEL, type UniversityType } from '@/lib/sponsorship';
import {
  useUniversity,
  useUniversityMutations,
  type UniversityInput,
} from '@/hooks/use-universities';
import { useModulesTree } from '@/hooks/use-modules-tree';
import {
  EMPTY_UNIVERSITY_FORM,
  NO_EXAM,
  toUniversityFormValues,
  toUniversityInput,
  validateUniversityForm,
  type UniversityFormValues,
} from './university-form-model';

const TYPES: UniversityType[] = ['public', 'private'];

export function UniversityForm({ universityId }: { universityId?: string }) {
  const { data: detail, isLoading } = useUniversity(universityId ?? '');
  if (universityId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!detail) {
      return <p className="text-muted-foreground text-sm">Universidad no encontrada.</p>;
    }
    return (
      <UniversityFormInner universityId={universityId} initial={toUniversityFormValues(detail)} />
    );
  }
  return <UniversityFormInner />;
}

function UniversityFormInner({
  universityId,
  initial,
}: {
  universityId?: string;
  initial?: UniversityFormValues;
}) {
  const router = useRouter();
  const { create, update } = useUniversityMutations();
  const form = useForm<UniversityFormValues>({
    defaultValues: initial ?? EMPTY_UNIVERSITY_FORM,
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

  const isPublic = form.watch('type') === 'public';
  const isSponsored = form.watch('isSponsored');

  async function submit(v: UniversityFormValues): Promise<void> {
    const error = validateUniversityForm(v);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      if (universityId) {
        const patch: Partial<UniversityInput> = toUniversityInput(v);
        delete patch.code;
        delete patch.country;
        await update.mutateAsync({ id: universityId, input: patch });
        toast.success('Universidad actualizada');
      } else {
        await create.mutateAsync(toUniversityInput(v));
        toast.success('Universidad creada');
      }
      router.push('/content/universities');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando la universidad');
    }
  }

  const isEdit = Boolean(universityId);

  const text = (
    name: keyof UniversityFormValues,
    label: string,
    desc?: string,
    disabled = false,
  ) => (
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
              {text(
                'name',
                'Nombre',
                'Solo para mostrar; el cruce con los cortes se hace por código.',
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Tipo</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-label="Tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {UNIVERSITY_TYPE_LABEL[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Las privadas no tienen corte ni nota de admisión: aparecen como oferta
                      promocional en el detalle de la carrera.
                    </FieldDescription>
                  </Field>
                )}
              />
              {text(
                'websiteUrl',
                'Sitio web',
                'Opcional. Debe empezar con https:// — la app lo abre tal cual.',
              )}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-3">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <MegaphoneIcon className="text-primary size-4" />
              Patrocinio
            </legend>
            <Controller
              name="isSponsored"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="u-sponsored">Patrocinada</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="u-sponsored"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <span className="text-sm">{field.value ? 'Sí' : 'No'}</span>
                  </div>
                  <FieldDescription>
                    Mientras la ventana esté vigente la app rotula «Patrocinado» en la fila y no se
                    puede ocultar (transparencia publicitaria).
                  </FieldDescription>
                </Field>
              )}
            />
            {isSponsored && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Controller
                  name="sponsoredFrom"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="u-sponsoredFrom">Desde</FieldLabel>
                      <DatePicker
                        id="u-sponsoredFrom"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Sin fecha de inicio"
                      />
                      <FieldDescription>Vacío = vigente desde ya.</FieldDescription>
                    </Field>
                  )}
                />
                <Controller
                  name="sponsoredUntil"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="u-sponsoredUntil">Hasta</FieldLabel>
                      <DatePicker
                        id="u-sponsoredUntil"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Sin fecha de fin"
                      />
                      <FieldDescription>Vacío = sin vencimiento.</FieldDescription>
                    </Field>
                  )}
                />
              </div>
            )}
          </fieldset>

          {isPublic && (
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
                      La proyección de nota de esta universidad se calcula con el desempeño de ESTE
                      examen. Sin asignar = estimado global del módulo (mezcla exámenes).
                    </FieldDescription>
                  </Field>
                )}
              />
            </fieldset>
          )}

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
