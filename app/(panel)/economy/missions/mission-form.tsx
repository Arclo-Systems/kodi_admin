'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CoinsIcon, FileTextIcon, LayersIcon, SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  MISSION_TYPES,
  MISSION_TYPE_LABELS,
  MISSION_CADENCES,
  MISSION_CADENCE_LABELS,
  useMissionTemplate,
  useMissionTemplateMutations,
  type MissionTemplate,
  type MissionTemplateInput,
  type MissionType,
  type MissionCadence,
} from '@/hooks/use-missions';

const GLOBAL = '__global__';

type FormValues = {
  type: MissionType;
  cadence: MissionCadence;
  country: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  kokosReward: number;
  kolonesReward: number;
  isActive: boolean;
};

function toValues(t: MissionTemplate): FormValues {
  return {
    type: t.type,
    cadence: t.cadence,
    country: t.country ?? '',
    title: t.title,
    description: t.description,
    target: t.target,
    xpReward: t.xpReward,
    kokosReward: t.kokosReward,
    kolonesReward: t.kolonesReward,
    isActive: t.isActive,
  };
}

function toUpdateInput(v: FormValues): Omit<MissionTemplateInput, 'type' | 'cadence'> {
  return {
    country: v.country || null,
    title: v.title.trim(),
    description: v.description.trim(),
    target: v.target,
    xpReward: v.xpReward,
    kokosReward: v.kokosReward,
    kolonesReward: v.kolonesReward,
    isActive: v.isActive,
  };
}

export function MissionForm({ templateId }: { templateId?: string }) {
  const { data: detail, isLoading } = useMissionTemplate(templateId ?? '');
  if (templateId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!detail) return <p className="text-muted-foreground text-sm">Template no encontrado.</p>;
    return <MissionFormInner templateId={templateId} initial={toValues(detail)} />;
  }
  return <MissionFormInner />;
}

function MissionFormInner({ templateId, initial }: { templateId?: string; initial?: FormValues }) {
  const router = useRouter();
  const { create, update } = useMissionTemplateMutations();
  const form = useForm<FormValues>({
    defaultValues: initial ?? {
      type: 'answer_correct_in_subject',
      cadence: 'daily',
      country: '',
      title: '',
      description: '',
      target: 1,
      xpReward: 0,
      kokosReward: 0,
      kolonesReward: 0,
      isActive: true,
    },
  });

  async function submit(v: FormValues): Promise<void> {
    if (v.xpReward + v.kokosReward + v.kolonesReward <= 0) {
      toast.error('La misión debe otorgar al menos un reward (XP, Kokos o Kolones)');
      return;
    }
    try {
      if (templateId) {
        await update.mutateAsync({ id: templateId, input: toUpdateInput(v) });
        toast.success('Template actualizado');
      } else {
        await create.mutateAsync({ type: v.type, cadence: v.cadence, ...toUpdateInput(v) });
        toast.success('Template creado');
      }
      router.push('/economy/missions');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando el template');
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-8">
          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <LayersIcon className="text-primary size-4" />
              Clasificación
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Tipo</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!templateId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MISSION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {MISSION_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {templateId && <FieldDescription>No editable luego de crear.</FieldDescription>}
                  </Field>
                )}
              />
              <Controller
                name="cadence"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Cadencia</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!templateId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MISSION_CADENCES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {MISSION_CADENCE_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {templateId && <FieldDescription>No editable luego de crear.</FieldDescription>}
                  </Field>
                )}
              />
              <Controller
                name="country"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>País</FieldLabel>
                    <Select
                      value={field.value || GLOBAL}
                      onValueChange={(v) => field.onChange(v === GLOBAL ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={GLOBAL}>Global (todos)</SelectItem>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.flag} {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <FileTextIcon className="text-primary size-4" />
              Contenido
            </legend>

            <Controller
              name="title"
              control={form.control}
              rules={{ required: 'Requerido' }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="m-title">Título</FieldLabel>
                  <Input {...field} id="m-title" maxLength={120} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              rules={{ required: 'Requerido' }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="m-desc">Descripción</FieldLabel>
                  <Textarea
                    {...field}
                    id="m-desc"
                    rows={2}
                    maxLength={300}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <CoinsIcon className="text-primary size-4" />
              Meta y recompensas
            </legend>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Controller
                name="target"
                control={form.control}
                rules={{ min: { value: 1, message: '≥ 1' } }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="m-target">Meta</FieldLabel>
                    <Input
                      id="m-target"
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === '' ? 1 : Number(e.target.value))}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="xpReward"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="m-xp">XP</FieldLabel>
                    <Input
                      id="m-xp"
                      type="number"
                      min={0}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </Field>
                )}
              />
              <Controller
                name="kokosReward"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="m-kokos">Kokos</FieldLabel>
                    <Input
                      id="m-kokos"
                      type="number"
                      min={0}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </Field>
                )}
              />
              <Controller
                name="kolonesReward"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="m-kolones">Kolones</FieldLabel>
                    <Input
                      id="m-kolones"
                      type="number"
                      min={0}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </Field>
                )}
              />
            </div>
            <FieldDescription>La misión debe otorgar al menos un reward.</FieldDescription>

            <Controller
              name="isActive"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="m-active">Estado</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Switch id="m-active" checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-sm">{field.value ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </Field>
              )}
            />
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/economy/missions')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              {templateId ? 'Guardar cambios' : 'Crear template'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
