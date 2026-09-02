'use client';

import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { SaveIcon, ZapIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEnergyConfig,
  useEnergyMutations,
  ENERGY_DEFAULTS,
  type EnergyConfig,
  type ModeCostField,
} from '@/hooks/use-energy-config';

// El mensaje se repite en cada check porque sin él zod imprime su default en inglés, y el vacío
// (NaN) cae en el invalid_type de z.number().
const atLeast = (min: number, error: string) => z.number(error).int(error).min(min, error);

const FROM_1 = 'Debe ser un entero de 1 o más';
const FROM_0 = 'Debe ser un entero de 0 o más';

// zod 4 rechaza NaN en z.number() y NaN es el sentinel de "campo vacío" del panel: sin la rama
// z.nan() el submit moriría en silencio con un error en un campo que se ve vacío. El 0 es válido
// a propósito (modo gratis), igual que en costPerMatch y que el min(0) del DTO del backend.
// El error también va en la unión porque zod unas veces propaga el issue de la rama más cercana
// (too_small) y otras el invalid_union.
const modeCost = z.union([atLeast(0, FROM_0), z.nan()], { error: FROM_0 });

const FormSchema = z.object({
  maxEnergy: atLeast(1, FROM_1),
  regenMinutes: atLeast(1, FROM_1),
  costPerMatch: atLeast(0, FROM_0),
  adBonus: atLeast(0, FROM_0),
  refillCostKokos: atLeast(0, FROM_0),
  costDuelo: modeCost,
  costArenaRapida: modeCost,
  costArenaAmigos: modeCost,
  costContrarreloj: modeCost,
  costSupervivencia: modeCost,
});
type FormValues = z.infer<typeof FormSchema>;

const MODE_FIELDS: readonly { name: ModeCostField; label: string }[] = [
  { name: 'costDuelo', label: 'Duelo' },
  { name: 'costArenaRapida', label: 'Arena rápida' },
  { name: 'costArenaAmigos', label: 'Arena con amigos' },
  { name: 'costContrarreloj', label: 'Contrarreloj' },
  { name: 'costSupervivencia', label: 'Supervivencia' },
];

const toFormValues = (config: EnergyConfig | null): FormValues => {
  const source = config ?? ENERGY_DEFAULTS;
  return {
    maxEnergy: source.maxEnergy,
    regenMinutes: source.regenMinutes,
    costPerMatch: source.costPerMatch,
    adBonus: source.adBonus,
    refillCostKokos: source.refillCostKokos,
    costDuelo: source.costDuelo ?? NaN,
    costArenaRapida: source.costArenaRapida ?? NaN,
    costArenaAmigos: source.costArenaAmigos ?? NaN,
    costContrarreloj: source.costContrarreloj ?? NaN,
    costSupervivencia: source.costSupervivencia ?? NaN,
  };
};

// Campo vacío = el modo hereda costPerMatch. El PUT es un upsert completo, así que el null
// explícito es lo que devuelve a heredar un modo que ya tenía costo propio.
const inheritedWhenEmpty = (value: number): number | null =>
  Number.isNaN(value) ? null : value;

export function EnergyConfigForm({ country }: { country: string | null }) {
  const { data, isLoading, isError } = useEnergyConfig(country);
  const { saveEnergy } = useEnergyMutations();
  // `values` resetea el form solo al cambiar la config del país (o a defaults si no hay), sin un
  // useEffect manual con form.reset.
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    values: toFormValues(data ?? null),
  });

  // La herencia se explica con el costo general que el founder está editando, no con el guardado.
  const generalCost = useWatch({ control: form.control, name: 'costPerMatch' });
  const generalCostLabel = Number.isNaN(generalCost) ? '—' : String(generalCost);

  async function onSubmit(v: FormValues): Promise<void> {
    try {
      await saveEnergy.mutateAsync({
        country,
        maxEnergy: v.maxEnergy,
        regenMinutes: v.regenMinutes,
        costPerMatch: v.costPerMatch,
        adBonus: v.adBonus,
        refillCostKokos: v.refillCostKokos,
        costDuelo: inheritedWhenEmpty(v.costDuelo),
        costArenaRapida: inheritedWhenEmpty(v.costArenaRapida),
        costArenaAmigos: inheritedWhenEmpty(v.costArenaAmigos),
        costContrarreloj: inheritedWhenEmpty(v.costContrarreloj),
        costSupervivencia: inheritedWhenEmpty(v.costSupervivencia),
      });
      toast.success('Energía guardada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando energía');
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>No se pudo cargar la config de energía.</AlertDescription>
      </Alert>
    );

  const num = (name: keyof FormValues, label: string, min: number, placeholder?: string) => (
    <Controller
      key={name}
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`e-${name}`}>{label}</FieldLabel>
          <Input
            id={`e-${name}`}
            type="number"
            min={min}
            step={1}
            placeholder={placeholder}
            value={Number.isNaN(field.value) ? '' : field.value}
            onChange={(e) => field.onChange(e.target.value === '' ? NaN : e.target.valueAsNumber)}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ZapIcon className="text-primary size-4" />
          Energía
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* noValidate: con la validación nativa el browser bloquea el submit por min/step y el
            founder ve una burbuja del navegador en vez del mensaje del panel. Manda zod. */}
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {num('maxEnergy', 'Tope de energía', 1)}
              {num('regenMinutes', 'Regeneración: minutos por +1', 1)}
              {num('costPerMatch', 'Costo general por partida', 0)}
              {num('adBonus', 'Bonus por video/ad', 0)}
              {num('refillCostKokos', 'Costo de refill (Kokos)', 0)}
            </div>
            <FieldSeparator />
            <FieldSet>
              <FieldLegend variant="label">Costo por modo</FieldLegend>
              <FieldDescription>
                Vacío = usa el costo general ({generalCostLabel}). Poné 0 para que un modo no
                cobre energía.
              </FieldDescription>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {MODE_FIELDS.map(({ name, label }) =>
                  num(name, label, 0, Number.isNaN(generalCost) ? undefined : generalCostLabel),
                )}
              </div>
            </FieldSet>
            <div className="flex justify-end">
              <Button type="submit" disabled={saveEnergy.isPending}>
                <SaveIcon className="size-4" />
                {saveEnergy.isPending ? 'Guardando…' : 'Guardar energía'}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
