'use client';

import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { GaugeIcon, SaveIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFreeLimitConfig,
  useEnergyMutations,
  FREE_LIMIT_DEFAULTS,
} from '@/hooks/use-energy-config';

const FormSchema = z.object({
  questionsPerVideo: z.number().int().min(0),
  maxVideosPerDay: z.number().int().min(0),
});
type FormValues = z.infer<typeof FormSchema>;

export function FreeLimitConfigForm({ country }: { country: string | null }) {
  const { data, isLoading, isError } = useFreeLimitConfig(country);
  const { saveFreeLimit } = useEnergyMutations();
  // `values` resetea el form al cambiar la config del país (o a defaults), sin useEffect manual.
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    values: data
      ? { questionsPerVideo: data.questionsPerVideo, maxVideosPerDay: data.maxVideosPerDay }
      : FREE_LIMIT_DEFAULTS,
  });

  const qpv = useWatch({ control: form.control, name: 'questionsPerVideo' });
  const mvd = useWatch({ control: form.control, name: 'maxVideosPerDay' });
  const qpvN = Number.isNaN(qpv) ? 0 : qpv;
  const mvdN = Number.isNaN(mvd) ? 0 : mvd;
  const dailyTotal = qpvN * mvdN;

  async function onSubmit(v: FormValues): Promise<void> {
    try {
      await saveFreeLimit.mutateAsync({ country, ...v });
      toast.success('Límites free guardados');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando los límites');
    }
  }

  if (isLoading) return <Skeleton className="h-56 w-full" />;
  if (isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>No se pudo cargar la config de límites free.</AlertDescription>
      </Alert>
    );

  const num = (name: keyof FormValues, label: string) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`f-${name}`}>{label}</FieldLabel>
          <Input
            id={`f-${name}`}
            type="number"
            min={0}
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
          <GaugeIcon className="text-primary size-4" />
          Límites del plan free
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {num('questionsPerVideo', 'Preguntas por video')}
              {num('maxVideosPerDay', 'Máx videos por día')}
            </div>
            <p className="text-muted-foreground text-sm">
              Cupo diario gratis = <span className="text-foreground font-medium">{dailyTotal}</span>{' '}
              preguntas ({qpvN} × {mvdN}). Sin ver video no hay preguntas; los planes pagos son
              ilimitados.
            </p>
            <div className="flex justify-end">
              <Button type="submit" disabled={saveFreeLimit.isPending}>
                <SaveIcon className="size-4" />
                {saveFreeLimit.isPending ? 'Guardando…' : 'Guardar límites'}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
