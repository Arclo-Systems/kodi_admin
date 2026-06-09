'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { CalendarIcon, MapPinIcon, MegaphoneIcon, SaveIcon, SmartphoneIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { AssetUpload } from '@/components/admin/asset-upload';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { useModulesTree } from '@/hooks/use-modules-tree';
import { useSponsorOptions } from '@/hooks/use-sponsors';
import {
  BANNER_PLACEMENTS,
  PLACEMENT_LABELS,
  useBanner,
  useBannerMutations,
  type Banner,
  type BannerInput,
  type BannerPlacement,
} from '@/hooks/use-banners';
import { PlacementPreview } from './placement-preview';

const NONE = '__none__';

type FormValues = {
  sponsorId: string;
  imageUrl: string;
  clickUrl: string;
  country: string;
  moduleId: string;
  placement: BannerPlacement;
  weight: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

function toValues(b: Banner): FormValues {
  return {
    sponsorId: b.sponsorId,
    imageUrl: b.imageUrl,
    clickUrl: b.clickUrl ?? '',
    country: b.country,
    moduleId: b.moduleId ?? '',
    placement: b.placement,
    weight: b.weight,
    startsAt: b.startsAt ? b.startsAt.slice(0, 16) : '',
    endsAt: b.endsAt ? b.endsAt.slice(0, 16) : '',
    isActive: b.isActive,
  };
}

function toInput(v: FormValues): BannerInput {
  return {
    sponsorId: v.sponsorId,
    imageUrl: v.imageUrl.trim(),
    clickUrl: v.clickUrl.trim() || null,
    country: v.country,
    moduleId: v.moduleId || null,
    placement: v.placement,
    weight: v.weight,
    startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : '',
    endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : '',
    isActive: v.isActive,
  };
}

export function BannerForm({ bannerId }: { bannerId?: string }) {
  const { data: detail, isLoading } = useBanner(bannerId ?? '');
  if (bannerId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!detail) return <p className="text-muted-foreground text-sm">Banner no encontrado.</p>;
    return <BannerFormInner bannerId={bannerId} initial={toValues(detail)} />;
  }
  return <BannerFormInner />;
}

function BannerFormInner({ bannerId, initial }: { bannerId?: string; initial?: FormValues }) {
  const router = useRouter();
  const { create, update } = useBannerMutations();
  const form = useForm<FormValues>({
    defaultValues: initial ?? {
      sponsorId: '',
      imageUrl: '',
      clickUrl: '',
      country: COUNTRIES[0]?.code ?? 'CR',
      moduleId: '',
      placement: 'practice_home',
      weight: 1,
      startsAt: '',
      endsAt: '',
      isActive: true,
    },
  });
  const country = useWatch({ control: form.control, name: 'country' });
  const placement = useWatch({ control: form.control, name: 'placement' });
  const imageUrl = useWatch({ control: form.control, name: 'imageUrl' });
  const { data: sponsors } = useSponsorOptions();
  const { data: tree } = useModulesTree(country);
  const modules = tree ?? [];

  async function submit(v: FormValues): Promise<void> {
    if (!v.imageUrl.trim()) {
      form.setError('imageUrl', { message: 'Requerido' });
      return;
    }
    if (!v.startsAt || !v.endsAt) {
      toast.error('Definí inicio y fin de la campaña');
      return;
    }
    if (new Date(v.startsAt) >= new Date(v.endsAt)) {
      toast.error('El inicio debe ser anterior al fin');
      return;
    }
    try {
      if (bannerId) {
        await update.mutateAsync({ id: bannerId, input: toInput(v) });
        toast.success('Banner actualizado');
      } else {
        await create.mutateAsync(toInput(v));
        toast.success('Banner creado');
      }
      router.push('/economy/banners');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando el banner');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <Card>
        <CardContent>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-8">
            <fieldset className="min-w-0 space-y-4">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <MegaphoneIcon className="text-primary size-4" />
                Sponsor y contenido
              </legend>

              <Controller
                name="sponsorId"
                control={form.control}
                rules={{ required: 'Elegí un sponsor' }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Sponsor</FieldLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Elegí un sponsor" />
                      </SelectTrigger>
                      <SelectContent>
                        {(sponsors ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="imageUrl"
                control={form.control}
                rules={{ required: 'Requerido' }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Imagen del banner</FieldLabel>
                    <AssetUpload
                      value={field.value || null}
                      onChange={(url) => field.onChange(url ?? '')}
                      endpoint="/api/admin/economy/banners/upload-image"
                      label="Subir imagen del banner"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="clickUrl"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="b-click">URL de destino (opcional)</FieldLabel>
                    <Input {...field} id="b-click" maxLength={500} placeholder="https://…" />
                    <FieldDescription>A dónde lleva el tap. Vacío = no clickable.</FieldDescription>
                  </Field>
                )}
              />
            </fieldset>

            <fieldset className="min-w-0 space-y-4">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <MapPinIcon className="text-primary size-4" />
                Segmentación
              </legend>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="country"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>País</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue('moduleId', '');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                <Controller
                  name="moduleId"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Módulo (opcional)</FieldLabel>
                      <Select
                        value={field.value || NONE}
                        onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todo el país" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Todo el país</SelectItem>
                          {modules.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.shortName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Controller
                  name="placement"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Placement</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BANNER_PLACEMENTS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {PLACEMENT_LABELS[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Controller
                  name="weight"
                  control={form.control}
                  rules={{ min: { value: 1, message: '1–100' }, max: { value: 100, message: '1–100' } }}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="b-weight">Peso (1–100)</FieldLabel>
                      <Input
                        id="b-weight"
                        type="number"
                        min={1}
                        max={100}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value === '' ? 1 : Number(e.target.value))}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldDescription>Probabilidad relativa de mostrarse.</FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </fieldset>

            <fieldset className="min-w-0 space-y-4">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="text-primary size-4" />
                Vigencia y estado
              </legend>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="startsAt"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="b-starts">Inicio</FieldLabel>
                      <DateTimePicker id="b-starts" value={field.value} onChange={field.onChange} />
                    </Field>
                  )}
                />
                <Controller
                  name="endsAt"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="b-ends">Fin</FieldLabel>
                      <DateTimePicker id="b-ends" value={field.value} onChange={field.onChange} />
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="b-active">Estado</FieldLabel>
                    <div className="flex items-center gap-2">
                      <Switch id="b-active" checked={field.value} onCheckedChange={field.onChange} />
                      <span className="text-sm">{field.value ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </Field>
                )}
              />
            </fieldset>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push('/economy/banners')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <SaveIcon className="size-4" />
                {bannerId ? 'Guardar cambios' : 'Crear banner'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <SmartphoneIcon className="size-4" />
          Vista previa
        </h2>
        <PlacementPreview placement={placement} imageUrl={imageUrl.trim() || null} />
      </div>
    </div>
  );
}
