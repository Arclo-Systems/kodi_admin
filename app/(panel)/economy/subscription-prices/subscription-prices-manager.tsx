'use client';

import { useCallback, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { CoinsIcon, PencilIcon, PlusIcon, SaveIcon, TagIcon, Trash2Icon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { PlanBadge, planLabel } from '@/lib/plans';
import { COUNTRIES } from '@/lib/countries';
import {
  useSubscriptionPrices,
  useSubscriptionPriceMutations,
  type SubscriptionPrice,
} from '@/hooks/use-subscription-prices';

const PLANS = ['basico', 'plus', 'pro'] as const;
const PERIODS = ['monthly', 'quarterly', 'yearly'] as const;
const CURRENCIES = ['CRC', 'GTQ', 'HNL', 'PAB', 'CLP', 'MXN', 'ARS', 'USD'] as const;
const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

// Radix <Select> no admite value vacío/null → sentinel para la fila Default (country=null).
const DEFAULT_COUNTRY = 'DEFAULT';
const packLabel = (n: number) => (n === 1 ? 'Módulo suelto' : `Pack de ${n}`);

const FormSchema = z.object({
  country: z.string().min(1), // sentinel 'DEFAULT' o código de país; se mapea a null al enviar
  plan: z.string().min(1), // el Select ofrece solo pagos; el backend valida nativeEnum(Plan)
  period: z.string().min(1), // el Select ofrece los 3 períodos; el backend valida
  packSize: z.number().int().min(1),
  price: z.number().positive(),
  currency: z.enum(CURRENCIES),
});
type FormValues = z.infer<typeof FormSchema>;
const DEFAULTS = {
  country: 'CR',
  plan: 'basico',
  period: 'monthly',
  packSize: 1,
  price: 0,
  currency: 'CRC',
} as FormValues;

const countryLabel = (code: string) => COUNTRIES.find((c) => c.code === code)?.label ?? code;
const money = (cents: number, currency: string) =>
  `${(cents / 100).toLocaleString('es-CR', { minimumFractionDigits: 2 })} ${currency}`;

export function SubscriptionPricesManager() {
  const { data: prices, isLoading, isError } = useSubscriptionPrices();
  const { create, update, remove } = useSubscriptionPriceMutations();
  const [editing, setEditing] = useState<SubscriptionPrice | null>(null);
  const [toDelete, setToDelete] = useState<SubscriptionPrice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });

  function cancelEdit() {
    setEditing(null);
    setError(null);
    form.reset(DEFAULTS);
  }

  const startEdit = useCallback(
    (p: SubscriptionPrice) => {
      setEditing(p);
      setError(null);
      form.reset({
        country: p.country ?? DEFAULT_COUNTRY,
        plan: p.plan,
        period: p.period,
        packSize: p.packSize,
        price: p.priceCents / 100,
        currency: p.currency as FormValues['currency'],
      });
    },
    [form],
  );

  function onSubmit(v: FormValues) {
    setError(null);
    const priceCents = Math.round(v.price * 100);
    const onError = (e: unknown) => setError((e as Error).message);
    if (editing) {
      update.mutate(
        { id: editing.id, input: { priceCents, currency: v.currency } },
        { onSuccess: cancelEdit, onError },
      );
    } else {
      create.mutate(
        {
          country: v.country === DEFAULT_COUNTRY ? null : v.country,
          plan: v.plan,
          period: v.period,
          packSize: v.packSize,
          priceCents,
          currency: v.currency,
        },
        { onSuccess: () => form.reset(DEFAULTS), onError },
      );
    }
  }

  const columns = useMemo<ColumnDef<SubscriptionPrice, unknown>[]>(
    () => [
      {
        accessorKey: 'country',
        header: 'País',
        meta: { label: 'País' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.country
            ? `${row.original.country} · ${countryLabel(row.original.country)}`
            : 'Default',
      },
      {
        accessorKey: 'plan',
        header: 'Plan',
        meta: { label: 'Plan' },
        enableSorting: false,
        cell: ({ row }) => <PlanBadge plan={row.original.plan} />,
      },
      {
        accessorKey: 'period',
        header: 'Período',
        meta: { label: 'Período' },
        enableSorting: false,
        cell: ({ row }) => PERIOD_LABELS[row.original.period] ?? row.original.period,
      },
      {
        accessorKey: 'packSize',
        header: 'Tamaño',
        meta: { label: 'Tamaño' },
        enableSorting: false,
        cell: ({ row }) => packLabel(row.original.packSize),
      },
      {
        accessorKey: 'priceCents',
        header: 'Precio',
        meta: { label: 'Precio' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">{money(row.original.priceCents, row.original.currency)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        meta: { label: 'Acciones' },
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => startEdit(row.original)}>
              <PencilIcon className="size-4" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setToDelete(row.original)}
            >
              <Trash2Icon className="size-4" />
              Borrar
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
            <TagIcon className="text-primary size-4" />
            {editing ? 'Editar precio' : 'Nuevo precio'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                          <SelectItem value={DEFAULT_COUNTRY}>Default (global)</SelectItem>
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
                  name="plan"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Plan</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!!editing}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLANS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {planLabel(p)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Controller
                  name="period"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Período</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!!editing}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIODS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {PERIOD_LABELS[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Controller
                  name="packSize"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="sp-size">Tamaño (1 = módulo suelto)</FieldLabel>
                      <Input
                        id="sp-size"
                        type="number"
                        min={1}
                        step={1}
                        disabled={!!editing}
                        value={Number.isNaN(field.value) ? '' : field.value}
                        onChange={(e) => field.onChange(e.target.value === '' ? NaN : e.target.valueAsNumber)}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="price"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="sp-price">Precio</FieldLabel>
                      <Input
                        id="sp-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={Number.isNaN(field.value) ? '' : field.value}
                        onChange={(e) => field.onChange(e.target.value === '' ? NaN : e.target.valueAsNumber)}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
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
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
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
          <AlertDescription>No se pudieron cargar los precios.</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          toolbar={<div className="ml-auto" aria-hidden />}
          columns={columns}
          data={prices ?? []}
          total={prices?.length ?? 0}
          page={1}
          pageSize={prices?.length || 1}
          loading={isLoading}
          onPageChange={() => {}}
          emptyIcon={<CoinsIcon />}
          emptyMessage="Sin precios configurados"
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Borrar precio"
        description="Se elimina esta celda de la grilla de precios de suscripción."
        destructive
        confirmLabel="Borrar"
        onConfirm={async () => {
          if (toDelete) await remove.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
