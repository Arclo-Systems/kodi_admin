'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Building2Icon,
  CalendarIcon,
  MapPinIcon,
  ReceiptIcon,
  SaveIcon,
  UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { SponsorLogoUpload } from './sponsor-logo-upload';
import {
  PIPELINE_STATUSES,
  PIPELINE_LABELS,
  useSponsor,
  useSponsorMutations,
  type Sponsor,
  type SponsorInput,
  type PipelineStatus,
  type SponsorCurrency,
} from '@/hooks/use-sponsors';

const MULTI = '__multi__';

type FormValues = {
  name: string;
  logoUrl: string | null;
  brandColor: string;
  website: string;
  country: string;
  isActive: boolean;
  pipelineStatus: PipelineStatus;
  currency: SponsorCurrency;
  appliesIva: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  legalName: string;
  taxId: string;
  billingEmail: string;
  contractStartsAt: string;
  contractEndsAt: string;
};

function toValues(s: Sponsor): FormValues {
  return {
    name: s.name,
    logoUrl: s.logoUrl,
    brandColor: s.brandColor ?? '',
    website: s.website ?? '',
    country: s.country ?? '',
    isActive: s.isActive,
    pipelineStatus: s.pipelineStatus,
    currency: s.currency,
    appliesIva: s.appliesIva,
    contactName: s.contactName ?? '',
    contactEmail: s.contactEmail ?? '',
    contactPhone: s.contactPhone ?? '',
    legalName: s.legalName ?? '',
    taxId: s.taxId ?? '',
    billingEmail: s.billingEmail ?? '',
    contractStartsAt: s.contractStartsAt ? s.contractStartsAt.slice(0, 10) : '',
    contractEndsAt: s.contractEndsAt ? s.contractEndsAt.slice(0, 10) : '',
  };
}

const dateToIso = (d: string): string | null =>
  d ? new Date(`${d}T00:00:00.000Z`).toISOString() : null;

function toInput(v: FormValues): SponsorInput {
  return {
    name: v.name.trim(),
    logoUrl: v.logoUrl,
    brandColor: v.brandColor.trim() || null,
    website: v.website.trim() || null,
    country: v.country || null,
    isActive: v.isActive,
    pipelineStatus: v.pipelineStatus,
    currency: v.currency,
    appliesIva: v.appliesIva,
    contactName: v.contactName.trim() || null,
    contactEmail: v.contactEmail.trim() || null,
    contactPhone: v.contactPhone.trim() || null,
    legalName: v.legalName.trim() || null,
    taxId: v.taxId.trim() || null,
    billingEmail: v.billingEmail.trim() || null,
    contractStartsAt: dateToIso(v.contractStartsAt),
    contractEndsAt: dateToIso(v.contractEndsAt),
  };
}

export function SponsorForm({ sponsorId }: { sponsorId?: string }) {
  const { data: detail, isLoading } = useSponsor(sponsorId ?? '');
  if (sponsorId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!detail) return <p className="text-muted-foreground text-sm">Sponsor no encontrado.</p>;
    return <SponsorFormInner sponsorId={sponsorId} initial={toValues(detail)} />;
  }
  return <SponsorFormInner />;
}

function SponsorFormInner({ sponsorId, initial }: { sponsorId?: string; initial?: FormValues }) {
  const router = useRouter();
  const { create, update } = useSponsorMutations();
  const form = useForm<FormValues>({
    defaultValues: initial ?? {
      name: '',
      logoUrl: null,
      brandColor: '',
      website: '',
      country: '',
      isActive: true,
      pipelineStatus: 'prospect',
      currency: 'CRC',
      appliesIva: true,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      legalName: '',
      taxId: '',
      billingEmail: '',
      contractStartsAt: '',
      contractEndsAt: '',
    },
  });

  async function submit(v: FormValues): Promise<void> {
    if (v.contractStartsAt && v.contractEndsAt && v.contractStartsAt > v.contractEndsAt) {
      toast.error('El inicio del contrato debe ser anterior al fin');
      return;
    }
    if (v.brandColor.trim() && !/^#[0-9A-Fa-f]{6}$/.test(v.brandColor.trim())) {
      toast.error('El color de marca debe ser un hex como #408D99');
      return;
    }
    try {
      if (sponsorId) {
        await update.mutateAsync({ id: sponsorId, input: toInput(v) });
        toast.success('Sponsor actualizado');
        router.push(`/economy/sponsors/${sponsorId}`);
      } else {
        const id = await create.mutateAsync(toInput(v));
        toast.success('Sponsor creado');
        router.push(id ? `/economy/sponsors/${id}` : '/economy/sponsors');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando el sponsor');
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-8">
          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <Building2Icon className="text-primary size-4" />
              Identidad y marca
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="name"
                control={form.control}
                rules={{ required: 'Requerido' }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                    <FieldLabel htmlFor="sp-name">Nombre</FieldLabel>
                    <Input {...field} id="sp-name" maxLength={120} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="website"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sp-web">Sitio web</FieldLabel>
                    <Input {...field} id="sp-web" placeholder="https://…" maxLength={500} />
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="brandColor"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Color de marca</FieldLabel>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label="Selector de color de marca"
                        value={field.value || '#408D99'}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border bg-transparent"
                      />
                      <Input
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="#RRGGBB (opcional)"
                        maxLength={7}
                        className="max-w-[140px]"
                      />
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange('')}
                        >
                          Quitar
                        </Button>
                      )}
                    </div>
                    <FieldDescription>
                      Se usa en el cover y el marcador del cupón en la app.
                    </FieldDescription>
                  </Field>
                )}
              />
              <Controller
                name="logoUrl"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Logo</FieldLabel>
                    <SponsorLogoUpload value={field.value} onChange={field.onChange} />
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <MapPinIcon className="text-primary size-4" />
              Pipeline y país
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="country"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>País</FieldLabel>
                    <Select
                      value={field.value || MULTI}
                      onValueChange={(v) => field.onChange(v === MULTI ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={MULTI}>Multi-país</SelectItem>
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
                name="pipelineStatus"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Pipeline</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STATUSES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PIPELINE_LABELS[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sp-active">Estado</FieldLabel>
                    <div className="flex items-center gap-2">
                      <Switch id="sp-active" checked={field.value} onCheckedChange={field.onChange} />
                      <span className="text-sm">{field.value ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <UserIcon className="text-primary size-4" />
              Contacto
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="contactName"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sp-cname">Contacto</FieldLabel>
                    <Input {...field} id="sp-cname" maxLength={120} />
                  </Field>
                )}
              />
              <Controller
                name="contactEmail"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sp-cemail">Email contacto</FieldLabel>
                    <Input {...field} id="sp-cemail" type="email" maxLength={200} />
                  </Field>
                )}
              />
              <Controller
                name="contactPhone"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sp-cphone">Teléfono</FieldLabel>
                    <Input {...field} id="sp-cphone" maxLength={40} />
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <ReceiptIcon className="text-primary size-4" />
              Facturación
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="legalName"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sp-legal">Razón social</FieldLabel>
                    <Input {...field} id="sp-legal" maxLength={200} />
                  </Field>
                )}
              />
              <Controller
                name="taxId"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sp-tax">Cédula jurídica</FieldLabel>
                    <Input {...field} id="sp-tax" maxLength={40} />
                  </Field>
                )}
              />
              <Controller
                name="billingEmail"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sp-bemail">Email facturación</FieldLabel>
                    <Input {...field} id="sp-bemail" type="email" maxLength={200} />
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="currency"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Moneda</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRC">CRC (₡)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                name="appliesIva"
                control={form.control}
                render={({ field }) => (
                  <Field orientation="horizontal" className="pt-6">
                    <Switch id="sp-iva" checked={field.value} onCheckedChange={field.onChange} />
                    <FieldLabel htmlFor="sp-iva">Aplica IVA</FieldLabel>
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <CalendarIcon className="text-primary size-4" />
              Contrato
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="contractStartsAt"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sp-cstart">Inicio de contrato</FieldLabel>
                    <DatePicker id="sp-cstart" value={field.value} onChange={field.onChange} placeholder="Sin fecha" />
                  </Field>
                )}
              />
              <Controller
                name="contractEndsAt"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sp-cend">Fin de contrato</FieldLabel>
                    <DatePicker id="sp-cend" value={field.value} onChange={field.onChange} placeholder="Sin fecha" />
                    <FieldDescription>Alimenta el cron de aviso de vencimiento.</FieldDescription>
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/economy/sponsors')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              {sponsorId ? 'Guardar cambios' : 'Crear sponsor'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
