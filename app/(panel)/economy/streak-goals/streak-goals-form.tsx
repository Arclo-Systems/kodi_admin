'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useStreakGoals,
  useStreakGoalsMutations,
  type StreakGoalTierInput,
} from '@/hooks/use-streak-goals';

// `z.number()` y no `z.coerce`: el input manda `valueAsNumber` (patrón del
// repo, ver rewards-config-form). Con `coerce` el tipo de entrada es `unknown`
// y el resolver de RHF deja de tipar el formulario.
const TierSchema = z.object({
  days: z.number().int().min(1).max(3650),
  kolones: z.number().int().min(0).max(1_000_000),
  multiplier: z.number().int().min(1).max(100),
  isActive: z.boolean(),
});

const FormSchema = z.object({
  tiers: z
    .array(TierSchema)
    .min(1, 'La escala necesita al menos una meta: sin opciones el usuario no puede avanzar')
    .max(10)
    .refine(
      (tiers) => new Set(tiers.map((t) => t.days)).size === tiers.length,
      'No puede haber dos metas con la misma cantidad de días',
    ),
});

type FormValues = z.infer<typeof FormSchema>;

const NUEVA: StreakGoalTierInput = {
  days: 7,
  kolones: 0,
  multiplier: 1,
  isActive: true,
};

export function StreakGoalsForm({ country }: { country: string | null }) {
  const { data, isLoading } = useStreakGoals(country);
  const { saveGoals } = useStreakGoalsMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { tiers: [] },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tiers',
  });

  // El país se cambia sin desmontar el form: sin este reset la escala de CR
  // quedaría pintada sobre la de GT.
  useEffect(() => {
    if (data === undefined) return;
    form.reset({
      tiers: data.map((t) => ({
        days: t.days,
        kolones: t.kolones,
        multiplier: t.multiplier,
        isActive: t.isActive,
      })),
    });
  }, [data, country, form]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  async function onSubmit(values: FormValues) {
    try {
      await saveGoals.mutateAsync({ country, tiers: values.tiers });
      toast.success('Metas de racha guardadas');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const errorTiers = form.formState.errors.tiers;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-1 items-end gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_1fr_auto_auto]"
          >
            <Field>
              <FieldLabel>Días</FieldLabel>
              <Input
                type="number"
                min={1}
                max={3650}
                aria-label={`Días de la meta ${index + 1}`}
                {...form.register(`tiers.${index}.days`, {
                  valueAsNumber: true,
                })}
              />
            </Field>

            <Field>
              <FieldLabel>Kolones</FieldLabel>
              <Input
                type="number"
                min={0}
                aria-label={`Kolones de la meta ${index + 1}`}
                {...form.register(`tiers.${index}.kolones`, {
                  valueAsNumber: true,
                })}
              />
            </Field>

            <Field>
              <FieldLabel>Multiplicador</FieldLabel>
              <Input
                type="number"
                min={1}
                max={100}
                aria-label={`Multiplicador de la meta ${index + 1}`}
                {...form.register(`tiers.${index}.multiplier`, {
                  valueAsNumber: true,
                })}
              />
            </Field>

            <Field>
              <FieldLabel>Activa</FieldLabel>
              <Switch
                checked={form.watch(`tiers.${index}.isActive`)}
                onCheckedChange={(v) =>
                  form.setValue(`tiers.${index}.isActive`, v, {
                    shouldDirty: true,
                  })
                }
                aria-label={`Meta ${index + 1} activa`}
              />
            </Field>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              aria-label={`Eliminar la meta ${index + 1}`}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {errorTiers?.root?.message ?? errorTiers?.message ? (
        <p className="text-destructive text-sm">
          {errorTiers?.root?.message ?? errorTiers?.message}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={() => append(NUEVA)}>
          <PlusIcon className="size-4" />
          Agregar meta
        </Button>

        <Button type="submit" disabled={saveGoals.isPending}>
          {saveGoals.isPending ? 'Guardando…' : 'Guardar escala'}
        </Button>
      </div>

      <FieldDescription>
        El multiplicador es solo copy: alimenta el mensaje &quot;X veces más
        probable que apruebes tu examen&quot;. Los Kolones se acreditan una vez,
        al alcanzar la meta.
      </FieldDescription>
    </form>
  );
}
