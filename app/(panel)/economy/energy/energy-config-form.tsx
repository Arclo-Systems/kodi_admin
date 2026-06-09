'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { SaveIcon, ZapIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useEnergyConfig, useEnergyMutations, ENERGY_DEFAULTS } from '@/hooks/use-energy-config';

const FormSchema = z.object({
  maxEnergy: z.number().int().min(1),
  regenMinutes: z.number().int().min(1),
  costPerMatch: z.number().int().min(0),
  adBonus: z.number().int().min(0),
  refillCostKokos: z.number().int().min(0),
});
type FormValues = z.infer<typeof FormSchema>;

export function EnergyConfigForm({ country }: { country: string | null }) {
  const { data, isLoading, isError } = useEnergyConfig(country);
  const { saveEnergy } = useEnergyMutations();
  // `values` resetea el form solo al cambiar la config del país (o a defaults si no hay), sin un
  // useEffect manual con form.reset.
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    values: data
      ? {
          maxEnergy: data.maxEnergy,
          regenMinutes: data.regenMinutes,
          costPerMatch: data.costPerMatch,
          adBonus: data.adBonus,
          refillCostKokos: data.refillCostKokos,
        }
      : ENERGY_DEFAULTS,
  });

  async function onSubmit(v: FormValues): Promise<void> {
    try {
      await saveEnergy.mutateAsync({ country, ...v });
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

  const num = (name: keyof FormValues, label: string, min: number) => (
    <Controller
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
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {num('maxEnergy', 'Tope de energía', 1)}
              {num('regenMinutes', 'Regeneración: minutos por +1', 1)}
              {num('costPerMatch', 'Costo por partida', 0)}
              {num('adBonus', 'Bonus por video/ad', 0)}
              {num('refillCostKokos', 'Costo de refill (Kokos)', 0)}
            </div>
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
