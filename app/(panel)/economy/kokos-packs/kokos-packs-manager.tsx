'use client';

import { useCallback, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CalendarClockIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleOffIcon,
  CoinsIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import {
  useKokosPacks,
  useKokosPackMutations,
  offerStatus,
  type KokosPack,
  type OfferStatus,
} from '@/hooks/use-kokos-packs';
import type { LucideIcon } from 'lucide-react';

const FormSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
    name: z.string().min(1, 'Requerido').max(80),
    amount: z.number().int().positive(),
    storeProductId: z.string().min(1, 'Requerido').max(255),
    priceUsd: z.number().min(0),
    offerUsd: z.number().min(0).optional(), // NaN/undefined = sin oferta
    offerStarts: z.string(), // '' = abierto
    offerEnds: z.string(),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0),
  })
  .refine((d) => !d.offerStarts || !d.offerEnds || d.offerEnds >= d.offerStarts, {
    message: 'Hasta debe ser ≥ Desde',
    path: ['offerEnds'],
  });
type FormValues = z.infer<typeof FormSchema>;

const DEFAULTS: FormValues = {
  slug: '',
  name: '',
  amount: 100,
  storeProductId: '',
  priceUsd: 0.99,
  offerUsd: NaN,
  offerStarts: '',
  offerEnds: '',
  isActive: true,
  sortOrder: 0,
};

const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

// Faro del estado de la oferta (display admin; 'none' no se muestra como badge).
const OFFER_FARO: Record<Exclude<OfferStatus, 'none'>, { tone: StatusTone; icon: LucideIcon; label: string }> = {
  active: { tone: 'success', icon: CircleCheckIcon, label: 'Vigente' },
  scheduled: { tone: 'info', icon: CalendarClockIcon, label: 'Programada' },
  expired: { tone: 'muted', icon: CircleDashedIcon, label: 'Expirada' },
};

export function KokosPacksManager() {
  const { data: packs, isLoading, isError } = useKokosPacks();
  const { create, update } = useKokosPackMutations();
  const [editing, setEditing] = useState<KokosPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });

  const priceUsd = useWatch({ control: form.control, name: 'priceUsd' });
  const offerUsd = useWatch({ control: form.control, name: 'offerUsd' });
  const offerStarts = useWatch({ control: form.control, name: 'offerStarts' });
  const offerEnds = useWatch({ control: form.control, name: 'offerEnds' });
  const offerTooHigh = offerUsd !== undefined && !Number.isNaN(offerUsd) && offerUsd >= priceUsd;

  function cancelEdit(): void {
    setEditing(null);
    setError(null);
    form.reset(DEFAULTS);
  }

  const startEdit = useCallback(
    (p: KokosPack): void => {
      setEditing(p);
      setError(null);
      form.reset({
        slug: p.slug,
        name: p.name,
        amount: p.amount,
        storeProductId: p.storeProductId,
        priceUsd: p.priceUsdCents / 100,
        offerUsd: p.offerPriceUsdCents != null ? p.offerPriceUsdCents / 100 : NaN,
        offerStarts: p.offerStartsAt ? p.offerStartsAt.slice(0, 10) : '',
        offerEnds: p.offerEndsAt ? p.offerEndsAt.slice(0, 10) : '',
        isActive: p.isActive,
        sortOrder: p.sortOrder,
      });
    },
    [form],
  );

  async function onSubmit(v: FormValues): Promise<void> {
    setError(null);
    const priceUsdCents = Math.round(v.priceUsd * 100);
    const hasOffer = v.offerUsd !== undefined && !Number.isNaN(v.offerUsd);
    const offer = {
      offerPriceUsdCents: hasOffer ? Math.round((v.offerUsd as number) * 100) : null,
      offerStartsAt: hasOffer && v.offerStarts ? `${v.offerStarts}T00:00:00.000Z` : null,
      offerEndsAt: hasOffer && v.offerEnds ? `${v.offerEnds}T23:59:59.999Z` : null,
    };
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          input: {
            name: v.name,
            amount: v.amount,
            priceUsdCents,
            isActive: v.isActive,
            sortOrder: v.sortOrder,
            ...offer,
          },
        });
      } else {
        await create.mutateAsync({
          slug: v.slug,
          name: v.name,
          amount: v.amount,
          storeProductId: v.storeProductId,
          priceUsdCents,
          isActive: v.isActive,
          sortOrder: v.sortOrder,
          ...offer,
        });
      }
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando el pack');
    }
  }

  const textField = (name: 'slug' | 'name' | 'storeProductId', label: string, disabled = false) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`k-${name}`}>{label}</FieldLabel>
          <Input id={`k-${name}`} {...field} disabled={disabled} aria-invalid={fieldState.invalid} />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );

  const numField = (
    name: 'amount' | 'priceUsd' | 'sortOrder' | 'offerUsd',
    label: string,
    opts: { step: number; min: number },
  ) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`k-${name}`}>{label}</FieldLabel>
          <Input
            id={`k-${name}`}
            type="number"
            step={opts.step}
            min={opts.min}
            value={field.value === undefined || Number.isNaN(field.value) ? '' : field.value}
            onChange={(e) => field.onChange(e.target.value === '' ? NaN : e.target.valueAsNumber)}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );

  const columns = useMemo<ColumnDef<KokosPack, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nombre',
        meta: { label: 'Nombre' },
        enableSorting: false,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'amount',
        header: 'Kokos',
        meta: { label: 'Kokos' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.amount.toLocaleString('es-CR')}</span>
        ),
      },
      {
        accessorKey: 'priceUsdCents',
        header: 'Precio',
        meta: { label: 'Precio' },
        enableSorting: false,
        cell: ({ row }) =>
          offerStatus(row.original) === 'active' ? (
            <span className="flex items-center gap-2 tabular-nums">
              <span className="text-muted-foreground line-through">{usd(row.original.priceUsdCents)}</span>
              <span className="font-medium">{usd(row.original.offerPriceUsdCents!)}</span>
            </span>
          ) : (
            <span className="tabular-nums">{usd(row.original.priceUsdCents)}</span>
          ),
      },
      {
        id: 'offer',
        header: 'Oferta',
        meta: { label: 'Oferta' },
        enableSorting: false,
        cell: ({ row }) => {
          const status = offerStatus(row.original);
          if (status === 'none') return <span className="text-muted-foreground">—</span>;
          const faro = OFFER_FARO[status];
          return <StatusBadge tone={faro.tone} icon={faro.icon} label={faro.label} />;
        },
      },
      {
        accessorKey: 'storeProductId',
        header: 'SKU',
        meta: { label: 'SKU' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground block max-w-[12rem] truncate">
            {row.original.storeProductId}
          </span>
        ),
      },
      {
        accessorKey: 'sortOrder',
        header: 'Orden',
        meta: { label: 'Orden' },
        enableSorting: false,
        cell: ({ row }) => <span className="tabular-nums">{row.original.sortOrder}</span>,
      },
      {
        accessorKey: 'isActive',
        header: 'Estado',
        meta: { label: 'Estado' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
          ) : (
            <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactivo" />
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CoinsIcon className="text-primary size-4" />
            {editing ? `Editar: ${editing.name}` : 'Nuevo pack'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {textField('slug', 'Slug (estable)', !!editing)}
                {textField('name', 'Nombre')}
                {numField('amount', 'Cantidad de Kokos', { step: 1, min: 1 })}
                {textField('storeProductId', 'SKU del store', !!editing)}
                {numField('priceUsd', 'Precio (USD)', { step: 0.01, min: 0 })}
                {numField('sortOrder', 'Orden', { step: 1, min: 0 })}
              </div>
              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="k-active">Estado</FieldLabel>
                    <div className="flex items-center gap-2">
                      <Switch id="k-active" checked={field.value} onCheckedChange={field.onChange} />
                      <span className="text-sm">{field.value ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <FieldDescription>Desactivar = retirar el pack.</FieldDescription>
                  </Field>
                )}
              />

              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">Oferta (opcional)</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {numField('offerUsd', 'Precio de oferta (USD)', { step: 0.01, min: 0 })}
                  <Field className="sm:col-span-2" data-invalid={!!form.formState.errors.offerEnds}>
                    <FieldLabel>Vigencia de la oferta</FieldLabel>
                    <DateRangePicker
                      from={offerStarts}
                      to={offerEnds}
                      onChange={(f, t) => {
                        form.setValue('offerStarts', f, { shouldValidate: true });
                        form.setValue('offerEnds', t, { shouldValidate: true });
                      }}
                      placeholder="Abierta"
                    />
                    {form.formState.errors.offerEnds && (
                      <FieldError errors={[form.formState.errors.offerEnds]} />
                    )}
                  </Field>
                </div>
                {offerTooHigh && (
                  <p className="text-destructive mt-2 text-xs">
                    La oferta debería ser menor al precio regular.
                  </p>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  Vacío = sin oferta. La oferta es de <strong>display</strong>: para que la store cobre
                  menos, apuntá el pack a un SKU de oferta en App Store / Play.
                </p>
              </div>

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
                  {editing ? 'Guardar' : 'Agregar'}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>No se pudieron cargar los packs.</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          toolbar={<div className="ml-auto" aria-hidden />}
          columns={columns}
          data={packs ?? []}
          total={packs?.length ?? 0}
          page={1}
          pageSize={packs?.length || 1}
          loading={isLoading}
          onPageChange={() => {}}
          emptyIcon={<CoinsIcon />}
          emptyMessage="Sin packs configurados"
        />
      )}
    </div>
  );
}
