'use client';

import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSponsorOptions } from '@/hooks/use-sponsors';
import { useRaffleActions, type CompleteRaffleInput, type RaffleDetail } from '@/hooks/use-raffles';
import { RafflePrizeUpload } from './raffle-prize-upload';

const NO_SPONSOR = '__none__';

type FormValues = {
  name: string;
  description: string;
  prizeDescription: string;
  prizeImageUrl: string;
  sponsorId: string;
  prizesCount: number;
};

export function CompleteRaffleForm({ raffle }: { raffle: RaffleDetail }) {
  const { complete } = useRaffleActions(raffle.id);
  const { data: sponsors } = useSponsorOptions();
  const form = useForm<FormValues>({
    defaultValues: {
      name: raffle.name,
      description: raffle.description,
      prizeDescription: raffle.prizeDescription ?? '',
      prizeImageUrl: raffle.prizeImageUrl ?? '',
      sponsorId: raffle.sponsorId ?? '',
      prizesCount: raffle.prizesCount,
    },
  });

  async function submit(v: FormValues): Promise<void> {
    const input: CompleteRaffleInput = {
      name: v.name.trim() || undefined,
      description: v.description.trim() || undefined,
      prizeDescription: v.prizeDescription.trim(),
      prizeImageUrl: v.prizeImageUrl.trim() || null,
      sponsorId: v.sponsorId || null,
      prizesCount: v.prizesCount,
    };
    try {
      await complete.mutateAsync(input);
      toast.success('Premiación actualizada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando la premiación');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="r-name">Nombre</FieldLabel>
              <Input {...field} id="r-name" maxLength={200} />
            </Field>
          )}
        />
        <Controller
          name="prizeDescription"
          control={form.control}
          rules={{ required: 'Requerido' }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="r-prize">Descripción del premio</FieldLabel>
              <Textarea {...field} id="r-prize" rows={2} maxLength={500} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Controller
            name="sponsorId"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Sponsor</FieldLabel>
                <Select
                  value={field.value || NO_SPONSOR}
                  onValueChange={(v) => field.onChange(v === NO_SPONSOR ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SPONSOR}>Sin sponsor</SelectItem>
                    {(sponsors ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            name="prizesCount"
            control={form.control}
            rules={{ min: { value: 1, message: '≥ 1' } }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="r-count">Cantidad de premios</FieldLabel>
                <Input
                  id="r-count"
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
        </div>
        <Controller
          name="prizeImageUrl"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Imagen del premio (opcional)</FieldLabel>
              <RafflePrizeUpload
                value={field.value || null}
                onChange={(url) => field.onChange(url ?? '')}
              />
            </Field>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <SaveIcon className="size-4" />
            Guardar premiación
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
