'use client';

import Image from 'next/image';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { EyeIcon, EyeOffIcon, SaveIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSponsorOptions, type SponsorOption } from '@/hooks/use-sponsors';
import { useRaffleActions, type CompleteRaffleInput, type RaffleDetail } from '@/hooks/use-raffles';
import { RafflePrizeUpload } from './raffle-prize-upload';

const NO_SPONSOR = '__none__';

/** El molde mensual nace con este texto: publicarlo sería anunciar un mes vacío. */
const PLACEHOLDER_PRIZE = 'Premio por definir';

export function hasRealPrize(prizeDescription: string): boolean {
  const value = prizeDescription.trim();
  return value.length > 0 && value !== PLACEHOLDER_PRIZE;
}

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
                <SponsorPreview sponsor={(sponsors ?? []).find((s) => s.id === field.value)} />
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
        <PublicationControl raffle={raffle} />
      </FieldGroup>
    </form>
  );
}

function SponsorPreview({ sponsor }: { sponsor: SponsorOption | undefined }) {
  if (!sponsor) return null;
  return (
    <>
      <div className="bg-muted/40 flex items-center gap-3 rounded-md border px-3 py-2">
        {sponsor.logoUrl ? (
          <Image
            src={sponsor.logoUrl}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded object-contain"
            unoptimized
          />
        ) : (
          <div className="bg-muted grid size-8 place-items-center rounded text-xs font-medium">
            {sponsor.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium">{sponsor.name}</span>
      </div>
      <FieldDescription>
        Así se ve en la tarjeta de Rankings. El nombre y el logo salen de la ficha del sponsor: para
        cambiarlos, se edita el sponsor.
      </FieldDescription>
    </>
  );
}

export function PublicationControl({ raffle }: { raffle: RaffleDetail }) {
  const { setPublication } = useRaffleActions(raffle.id);
  const published = raffle.publicationStatus === 'published';
  // Se mira lo GUARDADO, no el formulario: publicar con el premio escrito pero sin
  // guardar lo rechaza el backend igual.
  const prizeReady = hasRealPrize(raffle.prizeDescription);

  async function toggle(): Promise<void> {
    try {
      await setPublication.mutateAsync(published ? 'draft' : 'published');
      toast.success(published ? 'Premiación oculta' : 'Premiación publicada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cambiando la visibilidad');
    }
  }

  return (
    <div className="space-y-3 border-t pt-5">
      <Alert>
        <AlertTitle>
          {published ? 'Este mes está publicado' : 'Sin publicar, los usuarios no ven nada este mes'}
        </AlertTitle>
        <AlertDescription>
          {published
            ? 'Los usuarios ven la tarjeta de Rankings y la pantalla de premiaciones, y el cierre premia a los ganadores.'
            : 'No hay tarjeta en Rankings, la pantalla de premiaciones no muestra este mes y el cierre no premia a nadie.'}
        </AlertDescription>
      </Alert>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {!published && !prizeReady && (
          <p className="text-muted-foreground text-sm">
            Cargá y guardá el premio para poder publicar.
          </p>
        )}
        <Button
          type="button"
          variant={published ? 'outline' : 'default'}
          disabled={setPublication.isPending || (!published && !prizeReady)}
          onClick={toggle}
        >
          {published ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          {published ? 'Ocultar premiación' : 'Publicar premiación'}
        </Button>
      </div>
    </div>
  );
}
