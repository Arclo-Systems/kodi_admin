'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { LayersIcon, SaveIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { COUNTRIES } from '@/lib/countries';
import {
  DEFAULT_DAILY_CARD_CAP,
  useReviewSessionConfig,
  useReviewSessionConfigMutation,
} from '@/hooks/use-review-material';

// Radix no admite valor vacío en un Select: sentinel para "config global".
const GLOBAL = 'DEFAULT';

const FormSchema = z.object({ dailyCardCap: z.number().int().min(1).max(200) });
type FormValues = z.infer<typeof FormSchema>;

export function SessionCapCard() {
  const [scope, setScope] = useState<string>(GLOBAL);
  const country = scope === GLOBAL ? null : scope;
  const { data, isLoading, isError } = useReviewSessionConfig(country);
  const save = useReviewSessionConfigMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    values: { dailyCardCap: data?.dailyCardCap ?? DEFAULT_DAILY_CARD_CAP },
  });

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      await save.mutateAsync({ country, dailyCardCap: values.dailyCardCap });
      toast.success(
        country
          ? `Tope de ${country} guardado en ${values.dailyCardCap} tarjetas`
          : `Tope global guardado en ${values.dailyCardCap} tarjetas`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el tope');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayersIcon className="text-primary size-4" />
          Sesión diaria de tarjetas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-64" aria-label="Alcance de la configuración">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GLOBAL}>Configuración global (default)</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                Override de {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading && <Skeleton className="h-24 w-full" />}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription>No se pudo cargar el tope de la sesión.</AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md">
            <FieldGroup>
              <Controller
                name="dailyCardCap"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="daily-card-cap">Tarjetas por sesión</FieldLabel>
                    <Input
                      id="daily-card-cap"
                      type="number"
                      min={1}
                      max={200}
                      step={1}
                      value={Number.isNaN(field.value) ? '' : field.value}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? NaN : e.target.valueAsNumber)
                      }
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      Tope de la sesión del día. Si lo vencido no lo llena, se completa con
                      tarjetas nuevas de temas que el usuario ya empezó.
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={save.isPending}>
                  <SaveIcon className="size-4" />
                  {save.isPending ? 'Guardando…' : 'Guardar tope'}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
