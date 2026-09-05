'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FileTextIcon, LandmarkIcon, SaveIcon, WalletIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker, toYMD } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { civilDayToIso, isoToCivilDay } from '@/lib/civil-date';
import { FinanceReceiptUpload } from './finance-receipt-upload';
import {
  useFinanceAccounts,
  useFinanceCategories,
  useFinanceEntry,
  useFinanceEntryMutations,
  FINANCE_CURRENCIES,
  MOVEMENT_TYPES,
  MOVEMENT_TYPE_LABELS,
  type FinanceAccount,
  type FinanceEntry,
  type FinanceEntryInput,
  type FinanceKind,
  type MovementType,
} from '@/hooks/use-finance';

// Sentinel: el comprobante existente se mantiene si el usuario no lo toca (no se reenvía la key).
const KEEP = '__keep__';
// Radix no admite '' como valor de Select: la contrapartida "sin elegir" (que el
// backend resuelve a la cuenta 1900 Por clasificar) necesita un valor propio.
const DEFAULT_ACCOUNT = '__default__';

// El mismo regex que `zMoney()` en el backend. Se valida acá para que el monto no
// llegue al servidor como `1e3` ni con tres decimales: el borde HTTP recibe string
// justamente para no pasar el importe por un double.
const AMOUNT_RE = /^\d{1,12}(\.\d{1,2})?$/;

// Una transferencia mueve saldo entre dos cuentas propias; un aporte o un préstamo
// de socio entra a una caja o un banco. Los tres exigen ACTIVO de contrapartida
// (`assertCounterAccountType` en finance-entries.service.ts). Un gasto o un ingreso
// admiten además pasivo (lo que quedó a crédito).
const ASSET_ONLY_TYPES = new Set<MovementType>([
  'TRANSFER',
  'PARTNER_CONTRIBUTION',
  'PARTNER_LOAN',
]);

const FormSchema = z
  .object({
    type: z.enum(MOVEMENT_TYPES),
    categoryId: z.string().min(1, 'Elegí una categoría'),
    amount: z
      .string()
      .min(1, 'Requerido')
      .regex(AMOUNT_RE, 'Hasta 2 decimales')
      .refine((v) => Number(v) > 0, 'Mayor a 0'),
    currency: z.enum(FINANCE_CURRENCIES),
    date: z.string().min(1, 'Requerido'),
    accountId: z.string(),
    counterAccountId: z.string(),
    vendor: z.string(),
    note: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.type !== 'TRANSFER') return;
    if (!v.accountId)
      ctx.addIssue({ code: 'custom', path: ['accountId'], message: 'Elegí la cuenta de origen' });
    if (!v.counterAccountId)
      ctx.addIssue({
        code: 'custom',
        path: ['counterAccountId'],
        message: 'Elegí la cuenta de destino',
      });
  });

type FormValues = z.infer<typeof FormSchema>;

function toValues(entry: FinanceEntry): FormValues {
  return {
    type: entry.type,
    categoryId: entry.categoryId,
    amount: entry.amount,
    currency: FINANCE_CURRENCIES.includes(entry.currency as (typeof FINANCE_CURRENCIES)[number])
      ? (entry.currency as (typeof FINANCE_CURRENCIES)[number])
      : FINANCE_CURRENCIES[0],
    // El día por defecto es el de hoy en la pared del admin, no el de hoy en UTC: después de
    // las 18:00 en CR el ISO ya está en el día siguiente y el formulario abría con mañana.
    date: isoToCivilDay(entry.date),
    accountId: entry.accountId ?? '',
    counterAccountId: entry.counterAccountId ?? '',
    vendor: entry.vendor ?? '',
    note: entry.note ?? '',
  };
}

const EMPTY: FormValues = {
  type: 'EXPENSE',
  categoryId: '',
  amount: '',
  currency: 'USD',
  date: toYMD(new Date()),
  accountId: '',
  counterAccountId: '',
  vendor: '',
  note: '',
};

// La categoría no la usa el asiento de una transferencia ni de un movimiento de
// socio, pero el backend la exige en todos los tipos (`CreateFinanceEntrySchema`),
// así que el selector se muestra siempre. Solo se acota la lista donde el signo
// importa: un gasto no se imputa a una categoría de ingresos.
function kindForType(type: MovementType): FinanceKind | undefined {
  if (type === 'EXPENSE') return 'expense';
  if (type === 'INCOME') return 'income';
  return undefined;
}

const accountLabel = (a: FinanceAccount) => `${a.code} ${a.name}`;

export function FinanceEntryForm({ entryId }: { entryId?: string }) {
  const { data: entry, isLoading } = useFinanceEntry(entryId);
  if (entryId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!entry) return <p className="text-muted-foreground text-sm">Movimiento no encontrado.</p>;
    return <FinanceEntryFormInner entry={entry} />;
  }
  return <FinanceEntryFormInner />;
}

function FinanceEntryFormInner({ entry }: { entry?: FinanceEntry }) {
  const router = useRouter();
  const { create, update } = useFinanceEntryMutations();

  // KEEP = mantener el existente (edición), null = sin/quitar, string = nueva key.
  const [receipt, setReceipt] = useState<string | null>(entry?.hasReceipt ? KEEP : null);

  const values = useMemo(() => (entry ? toValues(entry) : undefined), [entry]);
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: values ?? EMPTY,
    values, // el movimiento llega async: RHF resetea cuando cambia
  });

  const type = useWatch({ control: form.control, name: 'type' });
  const isTransfer = type === 'TRANSFER';

  const voided = entry?.status === 'VOIDED';
  // Un movimiento ya asentado no puede cambiar de importe ni de cuentas sin
  // descuadrar el libro: el backend los rechaza con ENTRY_POSTED_IMMUTABLE.
  const posted = !!entry?.journalEntryId;
  const lockAccounting = posted || voided;

  const { data: categories } = useFinanceCategories(kindForType(type));
  const cats = categories ?? [];
  const { data: assetAccounts } = useFinanceAccounts({ postable: true, type: 'ASSET' });
  const { data: postableAccounts } = useFinanceAccounts({ postable: true });
  const counterOptions = useMemo(() => {
    if (ASSET_ONLY_TYPES.has(type)) return assetAccounts ?? [];
    return (postableAccounts ?? []).filter(
      (a) => a.type === 'ASSET' || a.type === 'LIABILITY',
    );
  }, [type, assetAccounts, postableAccounts]);

  async function submit(v: FormValues): Promise<void> {
    try {
      const descriptive = {
        vendor: v.vendor.trim() || null,
        note: v.note.trim() || null,
      };
      const accounting = {
        categoryId: v.categoryId,
        amount: v.amount,
        currency: v.currency,
        date: civilDayToIso(v.date),
        type: v.type,
        counterAccountId: v.counterAccountId || null,
      };
      if (entry) {
        // receipt === KEEP → no se manda (se mantiene); null o string → se actualiza.
        const receiptPatch = receipt === KEEP ? {} : { receiptKey: receipt };
        await update.mutateAsync({
          id: entry.id,
          // Contabilizado: solo viaja lo descriptivo. Reenviar la fecha reanclada a
          // mediodía bastaría para que el backend la leyera como un cambio y tirara 409.
          input: posted
            ? { ...descriptive, ...receiptPatch }
            : { ...accounting, ...descriptive, ...receiptPatch },
        });
        toast.success('Movimiento actualizado');
      } else {
        const input: FinanceEntryInput = {
          ...accounting,
          ...descriptive,
          accountId: v.accountId || null,
          receiptKey: receipt === KEEP ? null : receipt,
        };
        await create.mutateAsync(input);
        toast.success('Movimiento creado');
      }
      router.push('/finance/movimientos');
    } catch (e) {
      // El mensaje del backend ya viene en español y dice qué arreglar
      // (CATEGORY_WITHOUT_ACCOUNT, TRANSFER_REQUIRES_ASSET_ACCOUNTS, PERIOD_CLOSED…).
      toast.error(e instanceof Error ? e.message : 'Error guardando el movimiento');
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-8">
          {voided && (
            <Alert>
              <AlertDescription>
                Movimiento anulado: no se edita. Registrá uno nuevo con los datos correctos.
              </AlertDescription>
            </Alert>
          )}

          <fieldset className="min-w-0 space-y-4" disabled={voided}>
            <legend className="flex items-center gap-2 text-sm font-medium">
              <WalletIcon className="text-primary size-4" />
              Movimiento
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="fe-type">Tipo</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        // La lista de categorías se acota por tipo: la elegida puede
                        // ya no estar y quedaría enviada a ciegas.
                        form.setValue('categoryId', '');
                        form.setValue('counterAccountId', '');
                        form.setValue('accountId', '');
                      }}
                      disabled={lockAccounting}
                    >
                      <SelectTrigger id="fe-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MOVEMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {MOVEMENT_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                name="categoryId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fe-category">Categoría</FieldLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={lockAccounting}
                    >
                      <SelectTrigger id="fe-category" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Elegí una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {cats.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="amount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fe-amount">Monto</FieldLabel>
                    <Input
                      {...field}
                      id="fe-amount"
                      inputMode="decimal"
                      autoComplete="off"
                      disabled={lockAccounting}
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
                    <FieldLabel htmlFor="fe-currency">Moneda</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={lockAccounting}
                    >
                      <SelectTrigger id="fe-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FINANCE_CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                name="date"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fe-date">Fecha</FieldLabel>
                    <DatePicker
                      id="fe-date"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={lockAccounting}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            {posted && !voided && (
              <FieldDescription>
                Contabilizado: para corregir el monto, anulalo y cargalo de nuevo.
              </FieldDescription>
            )}
          </fieldset>

          <fieldset className="min-w-0 space-y-4" disabled={voided}>
            <legend className="flex items-center gap-2 text-sm font-medium">
              <LandmarkIcon className="text-primary size-4" />
              Cuentas
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {isTransfer && (
                <Controller
                  name="accountId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="fe-account">Cuenta de origen</FieldLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                        disabled={lockAccounting}
                      >
                        <SelectTrigger id="fe-account" aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Elegí la cuenta de origen" />
                        </SelectTrigger>
                        <SelectContent>
                          {(assetAccounts ?? []).map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {accountLabel(a)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>De dónde sale la plata.</FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              )}
              <Controller
                name="counterAccountId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fe-counter">
                      {isTransfer ? 'Cuenta de destino' : 'Contrapartida'}
                    </FieldLabel>
                    <Select
                      value={field.value || DEFAULT_ACCOUNT}
                      onValueChange={(v) => field.onChange(v === DEFAULT_ACCOUNT ? '' : v)}
                      disabled={lockAccounting}
                    >
                      <SelectTrigger id="fe-counter" aria-invalid={fieldState.invalid}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!isTransfer && (
                          <SelectItem value={DEFAULT_ACCOUNT}>
                            Por clasificar (predeterminada)
                          </SelectItem>
                        )}
                        {counterOptions.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {accountLabel(a)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {isTransfer ? 'A dónde entra la plata.' : 'Caja, banco o cuenta por pagar.'}
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4" disabled={voided}>
            <legend className="flex items-center gap-2 text-sm font-medium">
              <FileTextIcon className="text-primary size-4" />
              Detalle
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="vendor"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="fe-vendor">Proveedor / fuente</FieldLabel>
                    <Input {...field} id="fe-vendor" maxLength={200} />
                  </Field>
                )}
              />
              <Field>
                <FieldLabel>Comprobante</FieldLabel>
                <FinanceReceiptUpload value={receipt} onChange={setReceipt} />
              </Field>
            </div>

            <Controller
              name="note"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="fe-note">Nota</FieldLabel>
                  <Textarea {...field} id="fe-note" maxLength={1000} rows={3} />
                </Field>
              )}
            />
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/finance/movimientos')}
            >
              {voided ? 'Volver' : 'Cancelar'}
            </Button>
            {!voided && (
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <SaveIcon className="size-4" />
                {entry ? 'Guardar cambios' : 'Crear movimiento'}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
