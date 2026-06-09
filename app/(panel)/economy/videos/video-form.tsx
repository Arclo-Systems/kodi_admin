'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { CalendarIcon, LayersIcon, SaveIcon, VideoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { useSponsorOptions } from '@/hooks/use-sponsors';
import { useModulesTree } from '@/hooks/use-modules-tree';
import {
  useAdminVideo,
  useVideoMutations,
  VIDEO_CONTEXTS,
  VIDEO_CONTEXT_LABELS,
  VIDEO_DURATIONS,
  type AdminVideo,
  type VideoContext,
  type VideoInput,
} from '@/hooks/use-admin-videos';
import { VideoUpload } from './video-upload';

const NO_MODULE = '__none__';

type FormValues = {
  sponsorId: string;
  country: string;
  moduleId: string; // '' = sin módulo
  context: VideoContext;
  videoUrl: string;
  durationSec: number;
  weight: number;
  startsAt: string; // 'YYYY-MM-DD'
  endsAt: string;
  isActive: boolean;
};

function toValues(v: AdminVideo): FormValues {
  return {
    sponsorId: v.sponsorId,
    country: v.country,
    moduleId: v.moduleId ?? '',
    context: v.context,
    videoUrl: v.videoUrl,
    durationSec: v.durationSec,
    weight: v.weight,
    startsAt: v.startsAt ? v.startsAt.slice(0, 10) : '',
    endsAt: v.endsAt ? v.endsAt.slice(0, 10) : '',
    isActive: v.isActive,
  };
}

const DEFAULTS: FormValues = {
  sponsorId: '',
  country: '',
  moduleId: '',
  context: 'practice',
  videoUrl: '',
  durationSec: 30,
  weight: 1,
  startsAt: '',
  endsAt: '',
  isActive: true,
};

export function VideoForm({ videoId }: { videoId?: string }) {
  const { data: detail, isLoading } = useAdminVideo(videoId ?? '');
  if (videoId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!detail) return <p className="text-muted-foreground text-sm">Video no encontrado.</p>;
    return <VideoFormInner videoId={videoId} initial={toValues(detail)} />;
  }
  return <VideoFormInner />;
}

function VideoFormInner({ videoId, initial }: { videoId?: string; initial?: FormValues }) {
  const router = useRouter();
  const { create, update } = useVideoMutations();
  const { data: sponsors } = useSponsorOptions();
  const form = useForm<FormValues>({ defaultValues: initial ?? DEFAULTS });
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);

  const country = useWatch({ control: form.control, name: 'country' });
  const startsAt = useWatch({ control: form.control, name: 'startsAt' });
  const endsAt = useWatch({ control: form.control, name: 'endsAt' });
  const { data: tree } = useModulesTree(country || undefined);
  const modules = country ? (tree ?? []) : [];

  function onDurationDetected(seconds: number): void {
    setDetectedDuration(seconds);
    if ((VIDEO_DURATIONS as readonly number[]).includes(seconds)) {
      form.setValue('durationSec', seconds);
    }
  }

  const durationMismatch =
    detectedDuration !== null && !(VIDEO_DURATIONS as readonly number[]).includes(detectedDuration);
  const nearest =
    detectedDuration === null
      ? null
      : VIDEO_DURATIONS.reduce((a, b) =>
          Math.abs(b - detectedDuration) < Math.abs(a - detectedDuration) ? b : a,
        );

  async function submit(v: FormValues): Promise<void> {
    if (!v.videoUrl) {
      toast.error('Subí el archivo de video');
      return;
    }
    if (!videoId && (!v.sponsorId || !v.country)) {
      toast.error('Elegí sponsor y país');
      return;
    }
    if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) {
      toast.error('La fecha "hasta" debe ser ≥ "desde"');
      return;
    }
    // Solo se manda el módulo si pertenece al país elegido (si no, queda sin módulo).
    const moduleId = modules.some((m) => m.id === v.moduleId) ? v.moduleId : null;
    const startsAt = v.startsAt ? `${v.startsAt}T00:00:00.000Z` : null;
    const endsAt = v.endsAt ? `${v.endsAt}T23:59:59.999Z` : null;
    try {
      if (videoId) {
        await update.mutateAsync({
          id: videoId,
          input: {
            videoUrl: v.videoUrl,
            durationSec: v.durationSec,
            moduleId,
            context: v.context,
            weight: v.weight,
            startsAt,
            endsAt,
            isActive: v.isActive,
          },
        });
        toast.success('Video actualizado');
      } else {
        const input: VideoInput = {
          sponsorId: v.sponsorId,
          country: v.country,
          videoUrl: v.videoUrl,
          durationSec: v.durationSec,
          moduleId,
          context: v.context,
          weight: v.weight,
          startsAt,
          endsAt,
          isActive: v.isActive,
        };
        await create.mutateAsync(input);
        toast.success('Video creado');
      }
      router.push('/economy/videos');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando el video');
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Controller
                name="sponsorId"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Sponsor</FieldLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange} disabled={!!videoId}>
                      <SelectTrigger>
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
                    {videoId && <FieldDescription>No editable luego de crear.</FieldDescription>}
                  </Field>
                )}
              />
              <Controller
                name="country"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>País</FieldLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange} disabled={!!videoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí un país" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code} · {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {videoId && <FieldDescription>No editable luego de crear.</FieldDescription>}
                  </Field>
                )}
              />
              <Controller
                name="moduleId"
                control={form.control}
                render={({ field }) => {
                  const effective = modules.some((m) => m.id === field.value) ? field.value : '';
                  return (
                    <Field>
                      <FieldLabel>Módulo (opcional)</FieldLabel>
                      <Select
                        value={effective || NO_MODULE}
                        onValueChange={(v) => field.onChange(v === NO_MODULE ? '' : v)}
                        disabled={!country}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={country ? 'Sin módulo' : 'Elegí país primero'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_MODULE}>Sin módulo (todo el país)</SelectItem>
                          {modules.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.shortName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  );
                }}
              />
              <Controller
                name="context"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Contexto (pool)</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_CONTEXTS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {VIDEO_CONTEXT_LABELS[c]}
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
              <VideoIcon className="text-primary size-4" />
              Video
            </legend>
            <Controller
              name="videoUrl"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Archivo (mp4/webm, hasta 100 MB)</FieldLabel>
                  <VideoUpload
                    value={field.value || null}
                    onChange={(url) => field.onChange(url ?? '')}
                    onDurationDetected={onDurationDetected}
                  />
                </Field>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="durationSec"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Duración declarada</FieldLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_DURATIONS.map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d} segundos
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {durationMismatch && nearest !== null ? (
                      <FieldDescription className="text-warning">
                        El video dura ~{detectedDuration}s, que no es una duración estándar. Elegí la
                        más cercana ({nearest}s); la app valida el tiempo de visionado contra este valor.
                      </FieldDescription>
                    ) : (
                      <FieldDescription>Debe coincidir con la duración real del archivo.</FieldDescription>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="weight"
                control={form.control}
                rules={{ min: { value: 1, message: '≥ 1' } }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="v-weight">Peso (rotación)</FieldLabel>
                    <Input
                      id="v-weight"
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === '' ? 1 : Number(e.target.value))}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>Mayor peso = aparece más seguido en la rotación.</FieldDescription>
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
            <Field>
              <FieldLabel>Vigencia (opcional)</FieldLabel>
              <DateRangePicker
                from={startsAt}
                to={endsAt}
                onChange={(f, t) => {
                  form.setValue('startsAt', f);
                  form.setValue('endsAt', t);
                }}
                placeholder="Siempre activo"
                className="sm:max-w-md"
              />
              <FieldDescription>Vacío = activo ya y sin expiración.</FieldDescription>
            </Field>
            <Controller
              name="isActive"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="v-active">Estado</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Switch id="v-active" checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-sm">{field.value ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </Field>
              )}
            />
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/economy/videos')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              {videoId ? 'Guardar cambios' : 'Crear video'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
