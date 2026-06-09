'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm, type Control, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertTriangleIcon,
  EyeIcon,
  ImageIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  SendIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSegments } from '@/hooks/use-segments';
import {
  useCampaignMutations,
  type Campaign,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from '@/hooks/use-messaging';
import { MessagePreview } from '@/components/admin/message-preview';
import { CampaignAssetUpload } from '@/components/admin/campaign-asset-upload';

const APPROVAL_THRESHOLD = 1000;

// URL opcional: vacía (no la setea → backend cae a Koko) o http(s). El backend revalida
// con .url() estricto; acá basta el formato para feedback inmediato y bloquear javascript:.
const optionalHttpUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Debe ser una URL http(s)');

const FormSchema = z.object({
  segmentId: z.string().min(1, 'Elegí un segmento'),
  channel: z.enum(['email', 'push']),
  subject: z.string().trim().max(200, 'Máximo 200 caracteres'),
  headline: z.string().trim().max(200, 'Máximo 200 caracteres'),
  body: z.string().trim().min(1, 'Escribí el mensaje').max(10_000, 'Demasiado largo'),
  assetUrl: optionalHttpUrl,
  ctaLabel: z.string().trim().max(80, 'Máximo 80 caracteres'),
  ctaUrl: optionalHttpUrl,
  secondaryText: z.string().trim().max(500, 'Máximo 500 caracteres'),
});
type FormValues = z.infer<typeof FormSchema>;

type CampaignFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; campaignId: string; initial: Campaign };

function toDefaults(initial?: Campaign): FormValues {
  return {
    segmentId: initial?.segmentId ?? '',
    channel: initial?.channel ?? 'email',
    subject: initial?.subject ?? '',
    headline: initial?.headline ?? '',
    body: initial?.body ?? '',
    assetUrl: initial?.assetUrl ?? '',
    ctaLabel: initial?.ctaLabel ?? '',
    ctaUrl: initial?.ctaUrl ?? '',
    secondaryText: initial?.secondaryText ?? '',
  };
}

export function CampaignForm(props: CampaignFormProps) {
  const router = useRouter();
  const { data: segments, isLoading } = useSegments();
  const { create, update } = useCampaignMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: toDefaults(props.mode === 'edit' ? props.initial : undefined),
  });

  const v = form.watch();
  const isEmail = v.channel === 'email';
  const segment = segments?.find((s) => s.id === v.segmentId);
  const willNeedApproval = (segment?.lastCount ?? 0) > APPROVAL_THRESHOLD;

  function structuredPayload(values: FormValues) {
    if (values.channel !== 'email') return {};
    return {
      headline: values.headline || undefined,
      assetUrl: values.assetUrl || undefined,
      ctaLabel: values.ctaLabel || undefined,
      ctaUrl: values.ctaUrl || undefined,
      secondaryText: values.secondaryText || undefined,
    };
  }

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      if (props.mode === 'create') {
        const input: CreateCampaignInput = {
          kind: 'broadcast',
          channel: values.channel,
          subject: values.subject || undefined,
          body: values.body,
          segmentId: values.segmentId,
          ...structuredPayload(values),
        };
        const res = (await create.mutateAsync(input)) as { status?: string };
        toast.success(
          res?.status === 'pending_approval'
            ? 'Campaña creada — pendiente de aprobación (admin global)'
            : 'Campaña creada en borrador',
        );
        router.push('/messaging');
      } else {
        const input: UpdateCampaignInput = {
          channel: values.channel,
          subject: values.subject || undefined,
          body: values.body,
          segmentId: values.segmentId,
          ...structuredPayload(values),
        };
        await update.mutateAsync({ id: props.campaignId, input });
        toast.success('Campaña actualizada');
        router.push(`/messaging/${props.campaignId}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-8 pt-6">
          <fieldset className="space-y-4">
            <legend className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
              <SendIcon className="text-primary size-4" />
              Destino y canal
            </legend>
            <Controller
              name="segmentId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="cf-segment">Segmento</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                    <SelectTrigger id="cf-segment" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder={isLoading ? 'Cargando…' : 'Elegí un segmento'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(segments ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} (~{s.lastCount.toLocaleString('es-CR')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="channel"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="cf-channel">Canal</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="cf-channel" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            {willNeedApproval && (
              <div className="border-warning/30 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border p-3 text-sm">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <span>
                  Este segmento supera {APPROVAL_THRESHOLD.toLocaleString('es-CR')} usuarios: la
                  campaña quedará pendiente de aprobación de un admin global.
                </span>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
              <PencilIcon className="text-primary size-4" />
              Contenido
            </legend>
            <TextField
              control={form.control}
              name="subject"
              id="cf-subject"
              label={isEmail ? 'Asunto (línea de bandeja)' : 'Título de la notificación'}
            />
            {isEmail && (
              <TextField
                control={form.control}
                name="headline"
                id="cf-headline"
                label="Título principal"
                placeholder="El título grande dentro del email"
              />
            )}
            <TextField control={form.control} name="body" id="cf-body" label="Mensaje" textarea rows={6} />
          </fieldset>

          {isEmail && (
            <fieldset className="space-y-4">
              <legend className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
                <ImageIcon className="text-primary size-4" />
                Imagen y botón de acción
              </legend>
              <Controller
                name="assetUrl"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Imagen principal</FieldLabel>
                    <CampaignAssetUpload
                      value={field.value || null}
                      onChange={(url) => field.onChange(url ?? '')}
                    />
                  </Field>
                )}
              />
              <TextField control={form.control} name="ctaLabel" id="cf-cta-label" label="Texto del botón" placeholder="Empezar ahora" />
              <TextField control={form.control} name="ctaUrl" id="cf-cta-url" label="Enlace del botón" placeholder="https://kodi.app/…" />
              <TextField
                control={form.control}
                name="secondaryText"
                id="cf-secondary"
                label="Texto secundario (opcional)"
                textarea
                rows={2}
              />
            </fieldset>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {props.mode === 'create' ? (
                <PlusIcon className="size-4" />
              ) : (
                <SaveIcon className="size-4" />
              )}
              {form.formState.isSubmitting
                ? 'Guardando…'
                : props.mode === 'create'
                  ? 'Crear campaña'
                  : 'Guardar cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <EyeIcon className="text-info size-4" />
          Vista previa
        </h2>
        <MessagePreview
          channel={v.channel}
          subject={v.subject}
          body={v.body}
          {...(isEmail && {
            headline: v.headline,
            assetUrl: v.assetUrl,
            ctaLabel: v.ctaLabel,
            ctaUrl: v.ctaUrl,
            secondaryText: v.secondaryText,
          })}
        />
      </div>
    </form>
  );
}

// Campo de texto reutilizable (Input o Textarea) cableado a RHF — DRY sobre los ~7 campos.
function TextField({
  control,
  name,
  id,
  label,
  placeholder,
  textarea,
  rows,
}: {
  control: Control<FormValues>;
  name: FieldPath<FormValues>;
  id: string;
  label: string;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {textarea ? (
            <Textarea {...field} id={id} rows={rows} placeholder={placeholder} aria-invalid={fieldState.invalid} />
          ) : (
            <Input {...field} id={id} placeholder={placeholder} aria-invalid={fieldState.invalid} />
          )}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
