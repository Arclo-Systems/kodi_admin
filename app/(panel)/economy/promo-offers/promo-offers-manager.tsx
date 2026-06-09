'use client';

import { useCallback, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleCheckIcon, CircleOffIcon, PencilIcon, PlusIcon, SaveIcon, SparklesIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge } from '@/lib/status-badge';
import { COUNTRIES } from '@/lib/countries';
import { useStoreItems } from '@/hooks/use-store';
import {
  usePromoOffers,
  usePromoOffer,
  usePromoOfferMutations,
  type PromoOffer,
} from '@/hooks/use-promo-offers';
import { OfferPricesEditor } from './offer-prices-editor';

const NO_BADGE = 'NONE';

const FormSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
    label: z.string().min(1, 'Requerido').max(80),
    country: z.string().min(1),
    priceMode: z.enum(['explicit', 'percent']),
    discountPercent: z.number().int().min(1).max(99).optional(), // NaN/undefined = sin %
    slotsTotal: z.number().int().min(0),
    startsAt: z.string(),
    endsAt: z.string(),
    badgeItemId: z.string(),
    isActive: z.boolean(),
  })
  .refine((d) => (d.priceMode === 'percent' ? !Number.isNaN(d.discountPercent ?? NaN) : true), {
    message: 'El modo % exige un porcentaje',
    path: ['discountPercent'],
  })
  .refine((d) => !d.startsAt || !d.endsAt || d.endsAt >= d.startsAt, {
    message: 'Hasta debe ser ≥ Desde',
    path: ['endsAt'],
  });
type FormValues = z.infer<typeof FormSchema>;

const DEFAULTS: FormValues = {
  slug: '',
  label: '',
  country: 'CR',
  priceMode: 'explicit',
  discountPercent: NaN,
  slotsTotal: 1250,
  startsAt: '',
  endsAt: '',
  badgeItemId: NO_BADGE,
  isActive: true,
};

const countryLabel = (code: string) => COUNTRIES.find((c) => c.code === code)?.label ?? code;

export function PromoOffersManager() {
  const { data: offers, isLoading, isError } = usePromoOffers();
  const { create, update } = usePromoOfferMutations();
  const badges = useStoreItems({ itemType: 'insignia', page: 1, pageSize: 100 });
  const [editing, setEditing] = useState<PromoOffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const detail = usePromoOffer(editing?.id ?? null);
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });

  const priceMode = useWatch({ control: form.control, name: 'priceMode' });
  const startsAt = useWatch({ control: form.control, name: 'startsAt' });
  const endsAt = useWatch({ control: form.control, name: 'endsAt' });

  function cancelEdit(): void {
    setEditing(null);
    setError(null);
    form.reset(DEFAULTS);
  }

  const startEdit = useCallback(
    (o: PromoOffer): void => {
      setEditing(o);
      setError(null);
      form.reset({
        slug: o.slug,
        label: o.label,
        country: o.country,
        priceMode: o.priceMode,
        discountPercent: o.discountPercent ?? NaN,
        slotsTotal: o.slotsTotal,
        startsAt: o.startsAt ? o.startsAt.slice(0, 10) : '',
        endsAt: o.endsAt ? o.endsAt.slice(0, 10) : '',
        badgeItemId: o.badgeItemId ?? NO_BADGE,
        isActive: o.isActive,
      });
    },
    [form],
  );

  const columns = useMemo<ColumnDef<PromoOffer, unknown>[]>(
    () => [
      {
        accessorKey: 'country',
        header: 'País',
        meta: { label: 'País' },
        enableSorting: false,
        cell: ({ row }) => `${row.original.country} · ${countryLabel(row.original.country)}`,
      },
      {
        accessorKey: 'label',
        header: 'Oferta',
        meta: { label: 'Oferta' },
        enableSorting: false,
        cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
      },
      {
        accessorKey: 'priceMode',
        header: 'Precio',
        meta: { label: 'Precio' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.priceMode === 'percent'
            ? `−${row.original.discountPercent}%`
            : 'Tabla propia',
      },
      {
        id: 'slots',
        header: 'Cupos',
        meta: { label: 'Cupos' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.slotsClaimed.toLocaleString('es-CR')} /{' '}
            {row.original.slotsTotal.toLocaleString('es-CR')}
          </span>
        ),
      },
      {
        id: 'window',
        header: 'Ventana',
        meta: { label: 'Ventana' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.startsAt || row.original.endsAt
              ? `${row.original.startsAt ? row.original.startsAt.slice(0, 10) : '—'} → ${row.original.endsAt ? row.original.endsAt.slice(0, 10) : '—'}`
              : 'Abierta'}
          </span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Estado',
        meta: { label: 'Estado' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge tone="success" icon={CircleCheckIcon} label="Activa" />
          ) : (
            <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactiva" />
          ),
      },
      {
        id: 'actions',
        header: '',
        meta: { label: 'Acciones' },
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => startEdit(row.original)}>
              <PencilIcon className="size-4" />
              Editar
            </Button>
          </div>
        ),
      },
    ],
    [startEdit],
  );

  async function onSubmit(v: FormValues): Promise<void> {
    setError(null);
    const discountPercent =
      v.priceMode === 'percent' && !Number.isNaN(v.discountPercent ?? NaN)
        ? (v.discountPercent as number)
        : null;
    const common = {
      label: v.label,
      priceMode: v.priceMode,
      discountPercent,
      slotsTotal: v.slotsTotal,
      startsAt: v.startsAt ? `${v.startsAt}T00:00:00.000Z` : null,
      endsAt: v.endsAt ? `${v.endsAt}T23:59:59.999Z` : null,
      badgeItemId: v.badgeItemId === NO_BADGE ? null : v.badgeItemId,
      isActive: v.isActive,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input: common });
      } else {
        await create.mutateAsync({ slug: v.slug, country: v.country, ...common });
      }
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando la oferta');
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="text-primary size-4" />
            {editing ? `Editar: ${editing.label} (${editing.country})` : 'Nueva oferta'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Controller
                  name="slug"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="o-slug">Slug (estable)</FieldLabel>
                      <Input id="o-slug" {...field} disabled={!!editing} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="label"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="o-label">Nombre</FieldLabel>
                      <Input id="o-label" {...field} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="country"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>País</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!!editing}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.code} · {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Controller
                  name="priceMode"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Modo de precio</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="explicit">Tabla propia</SelectItem>
                          <SelectItem value="percent">% de descuento</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                {priceMode === 'percent' && (
                  <Controller
                    name="discountPercent"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="o-pct">% de descuento</FieldLabel>
                        <Input
                          id="o-pct"
                          type="number"
                          min={1}
                          max={99}
                          step={1}
                          value={field.value === undefined || Number.isNaN(field.value) ? '' : field.value}
                          onChange={(e) =>
                            field.onChange(e.target.value === '' ? NaN : e.target.valueAsNumber)
                          }
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                )}
                <Controller
                  name="slotsTotal"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="o-slots">Cupos totales</FieldLabel>
                      <Input
                        id="o-slots"
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
                <Controller
                  name="badgeItemId"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Insignia</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_BADGE}>Sin insignia</SelectItem>
                          {(badges.data?.items ?? []).map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Field className="sm:col-span-2" data-invalid={!!form.formState.errors.endsAt}>
                  <FieldLabel>Ventana (opcional)</FieldLabel>
                  <DateRangePicker
                    from={startsAt}
                    to={endsAt}
                    onChange={(f, t) => {
                      form.setValue('startsAt', f, { shouldValidate: true });
                      form.setValue('endsAt', t, { shouldValidate: true });
                    }}
                    placeholder="Abierta"
                  />
                  {form.formState.errors.endsAt && (
                    <FieldError errors={[form.formState.errors.endsAt]} />
                  )}
                </Field>
              </div>

              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="o-active">Estado</FieldLabel>
                    <div className="flex items-center gap-2">
                      <Switch id="o-active" checked={field.value} onCheckedChange={field.onChange} />
                      <span className="text-sm">{field.value ? 'Activa' : 'Inactiva'}</span>
                    </div>
                    <FieldDescription>Desactivar = retirar la oferta.</FieldDescription>
                  </Field>
                )}
              />

              {priceMode === 'explicit' && (
                <p className="text-muted-foreground text-xs">
                  Modo tabla propia: guardá la oferta y luego cargá la grilla de precios abajo.
                </p>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end gap-2">
                {editing && (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {editing ? <SaveIcon className="size-4" /> : <PlusIcon className="size-4" />}
                  {editing ? 'Guardar' : 'Crear oferta'}
                </Button>
              </div>
            </FieldGroup>
          </form>

          {editing && editing.priceMode === 'explicit' && (
            <div className="mt-6 border-t pt-4">
              {detail.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : detail.data ? (
                <OfferPricesEditor offerId={editing.id} prices={detail.data.prices} />
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>No se pudieron cargar las ofertas.</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          toolbar={<div className="ml-auto" aria-hidden />}
          columns={columns}
          data={offers ?? []}
          total={offers?.length ?? 0}
          page={1}
          pageSize={offers?.length || 1}
          loading={isLoading}
          onPageChange={() => {}}
          emptyIcon={<SparklesIcon />}
          emptyMessage="Sin ofertas configuradas"
        />
      )}
    </div>
  );
}
