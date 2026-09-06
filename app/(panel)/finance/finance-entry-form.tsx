'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  CASH_ROOT_CODE,
  FINANCE_CURRENCIES,
  MOVEMENT_TYPES,
  RECEIVABLE_ROOT_CODE,
  type FinanceAccount,
  type FinanceEntry,
  type FinanceEntryInput,
  type FinanceKind,
  type MovementType,
} from '@/hooks/use-finance';
import { MOVEMENT_TYPE_HINTS, MOVEMENT_TYPE_LABELS, accountLabel } from './finance-format';

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

// Los tres tipos cuyo asiento se imputa contra la cuenta de la categoría.
const CATEGORY_ACCOUNT_TYPES = new Set<MovementType>(['INCOME', 'EXPENSE', 'OTHER']);

// Liquidar un saldo ya registrado: las DOS cuentas son obligatorias y ninguna
// admite la contrapartida por defecto ("1900 Por clasificar"), porque saldar una
// deuda contra ella dejaría el pasivo en cero y el faltante donde nadie mira.
const SETTLEMENT_TYPES = new Set<MovementType>(['LIABILITY_PAYMENT', 'RECEIVABLE_COLLECTION']);

/**
 * Si la cuenta cuelga de la rama `rootCode` del plan.
 *
 * El backend valida por RAMA y no por clase ni por prefijo del código: "caja o
 * banco" es lo que cuelga de `1100` (`1190 Traslados entre monedas` y `1900 Por
 * clasificar` también son ASSET y no lo son), y los códigos de las hijas los
 * teclea el founder. `ancestorCodes` viene calculado sobre el plan COMPLETO, así
 * que sigue siendo correcto con `postable=true`, donde los padres no viajan.
 */
const isUnderBranch = (account: FinanceAccount, rootCode: string): boolean =>
  account.ancestorCodes.includes(rootCode);

/**
 * Una transferencia entre cuentas de monedas FIJAS y distintas no mueve el mismo
 * importe de un lado al otro: lo que sale son colones y lo que llega son dólares.
 * El backend lo exige (409 `TRANSFER_REQUIRES_COUNTER_AMOUNT`) y necesita saber
 * la moneda de cada cuenta, que solo se conoce con el plan cargado — de ahí que
 * el schema sea una función y no una constante.
 */
function isCrossCurrency(
  currencyById: ReadonlyMap<string, string | null>,
  accountId: string,
  counterAccountId: string,
): boolean {
  const origin = currencyById.get(accountId);
  const destination = currencyById.get(counterAccountId);
  return !!origin && !!destination && origin !== destination;
}

function schemaFor(currencyById: ReadonlyMap<string, string | null>) {
  return z
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
      counterAmount: z.string(),
      vendor: z.string(),
      note: z.string(),
    })
    .superRefine((v, ctx) => {
      if (SETTLEMENT_TYPES.has(v.type)) {
        const esPago = v.type === 'LIABILITY_PAYMENT';
        if (!v.accountId)
          ctx.addIssue({
            code: 'custom',
            path: ['accountId'],
            message: esPago ? 'Elegí la deuda que se paga' : 'Elegí la cuenta por cobrar',
          });
        if (!v.counterAccountId)
          ctx.addIssue({
            code: 'custom',
            path: ['counterAccountId'],
            message: 'Elegí la cuenta de caja o banco',
          });
        // Las dos no pueden coincidir por construcción: una cuelga de 1200 (o es
        // un pasivo) y la otra de 1100. No hace falta comprobarlo.
        return;
      }
      if (v.type !== 'TRANSFER') return;
      if (!v.accountId)
        ctx.addIssue({ code: 'custom', path: ['accountId'], message: 'Elegí la cuenta de origen' });
      if (!v.counterAccountId)
        ctx.addIssue({
          code: 'custom',
          path: ['counterAccountId'],
          message: 'Elegí la cuenta de destino',
        });
      // Transferir una cuenta contra sí misma cuadra el asiento sin que pase nada;
      // el backend lo corta con 409 TRANSFER_REQUIRES_ASSET_ACCOUNTS, pero decirlo
      // acá evita el viaje.
      if (v.accountId && v.accountId === v.counterAccountId)
        ctx.addIssue({
          code: 'custom',
          path: ['counterAccountId'],
          message: 'La cuenta de destino debe ser distinta de la de origen',
        });
      if (!isCrossCurrency(currencyById, v.accountId, v.counterAccountId)) return;
      const issue = (message: string) =>
        ctx.addIssue({ code: 'custom', path: ['counterAmount'], message });
      if (!v.counterAmount) issue('Requerido');
      else if (!AMOUNT_RE.test(v.counterAmount)) issue('Hasta 2 decimales');
      else if (!(Number(v.counterAmount) > 0)) issue('Mayor a 0');
    });
}

type FormValues = z.infer<ReturnType<typeof schemaFor>>;

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
    counterAmount: entry.counterAmount ?? '',
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
  counterAmount: '',
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

// Cómo se llama cada cuenta según el tipo. El nombre del campo dice qué elegir;
// la ayuda de abajo, en qué dirección va la plata.
function originLabel(type: MovementType): string {
  if (type === 'LIABILITY_PAYMENT') return 'Cuenta a pagar';
  if (type === 'RECEIVABLE_COLLECTION') return 'Cuenta por cobrar';
  return 'Cuenta de origen';
}

function originHint(type: MovementType): string {
  if (type === 'LIABILITY_PAYMENT') return '¿Qué deuda estás pagando?';
  if (type === 'RECEIVABLE_COLLECTION') return '¿Qué estás cobrando?';
  return 'De dónde sale la plata.';
}

function counterLabel(type: MovementType): string {
  if (type === 'LIABILITY_PAYMENT') return 'Desde';
  if (type === 'RECEIVABLE_COLLECTION') return 'Hacia';
  return type === 'TRANSFER' ? 'Cuenta de destino' : 'Contrapartida';
}

function counterHint(type: MovementType): string {
  if (type === 'LIABILITY_PAYMENT') return '¿De qué cuenta sale la plata? Caja o banco.';
  if (type === 'RECEIVABLE_COLLECTION') return '¿A qué cuenta entra la plata? Caja o banco.';
  return type === 'TRANSFER' ? 'A dónde entra la plata.' : 'Caja, banco o cuenta por pagar.';
}

// `currency: null` = la cuenta acepta cualquier moneda (resultados, "Por
// clasificar"). El resto solo admite líneas en la suya.
const matchesCurrency = (accounts: FinanceAccount[], currency: string) =>
  accounts.filter((a) => a.currency === null || a.currency === currency);

// Radix abre un popover vacío si no hay hijos: un ítem deshabilitado explica por
// qué no hay nada que elegir.
function AccountItems({ accounts }: { accounts: FinanceAccount[] }) {
  if (accounts.length === 0) {
    return (
      <SelectItem value="__empty__" disabled>
        No hay cuentas disponibles
      </SelectItem>
    );
  }
  return (
    <>
      {accounts.map((a) => (
        <SelectItem key={a.id} value={a.id}>
          {accountLabel(a)}
        </SelectItem>
      ))}
    </>
  );
}

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

  const voided = entry?.status === 'VOIDED';
  // Un movimiento ya asentado no puede cambiar de importe ni de cuentas sin
  // descuadrar el libro: el backend los rechaza con ENTRY_POSTED_IMMUTABLE.
  const posted = !!entry?.journalEntryId;
  const lockAccounting = posted || voided;

  const assets = useFinanceAccounts({ postable: true, type: 'ASSET' });
  const postable = useFinanceAccounts({ postable: true });
  const accountsLoading = assets.isLoading || postable.isLoading;
  const accountsError = assets.isError || postable.isError;
  const retryAccounts = () => {
    void assets.refetch();
    void postable.refetch();
  };

  // La moneda de cada cuenta decide si la transferencia es una conversión, y eso
  // lo tiene que saber la validación: el schema se arma con el plan cargado.
  const currencyById = useMemo(
    () => new Map([...(assets.data ?? []), ...(postable.data ?? [])].map((a) => [a.id, a.currency])),
    [assets.data, postable.data],
  );
  const schema = useMemo(() => schemaFor(currencyById), [currencyById]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: values ?? EMPTY,
    values, // el movimiento llega async: RHF resetea cuando cambia
  });

  const type = useWatch({ control: form.control, name: 'type' });
  const currency = useWatch({ control: form.control, name: 'currency' });
  const accountId = useWatch({ control: form.control, name: 'accountId' });
  const counterAccountId = useWatch({ control: form.control, name: 'counterAccountId' });
  const isTransfer = type === 'TRANSFER';
  const isSettlement = SETTLEMENT_TYPES.has(type);
  const isPayment = type === 'LIABILITY_PAYMENT';
  // Los tres tipos que eligen las dos cuentas a mano: ninguno acepta la
  // contrapartida por defecto.
  const needsBothAccounts = isTransfer || isSettlement;
  const crossCurrency =
    isTransfer && isCrossCurrency(currencyById, accountId, counterAccountId);
  const destinationCurrency = currencyById.get(counterAccountId) ?? '';

  const { data: categories } = useFinanceCategories(kindForType(type));
  const cats = categories ?? [];
  // Solo el asiento de un ingreso, un gasto o un "otro" se imputa contra la cuenta
  // de la categoría (`requireCategoryAccount`, rama `default` de
  // `finance-entries.service.ts`). Una transferencia o un movimiento de socio se
  // asientan entre cuentas de activo/patrimonio y la categoría queda como
  // etiqueta: deshabilitarla ahí bloqueaba un alta que el backend acepta.
  const needsCategoryAccount = CATEGORY_ACCOUNT_TYPES.has(type);
  // Una categoría sin cuenta no se puede contabilizar: elegirla solo consigue un
  // 409 CATEGORY_WITHOUT_ACCOUNT al guardar. Se ofrece deshabilitada (para que se
  // vea que existe y por qué no sirve) y el aviso dice dónde se arregla.
  const hasUnmappedCategory = needsCategoryAccount && cats.some((c) => c.isActive && !c.accountId);

  const branchOptions = useMemo(() => {
    const postables = postable.data ?? [];
    return {
      cash: postables.filter((a) => isUnderBranch(a, CASH_ROOT_CODE)),
      receivable: postables.filter((a) => isUnderBranch(a, RECEIVABLE_ROOT_CODE)),
      liability: postables.filter((a) => a.type === 'LIABILITY'),
    };
  }, [postable.data]);

  const originOptions = useMemo(() => {
    if (isSettlement)
      return matchesCurrency(
        isPayment ? branchOptions.liability : branchOptions.receivable,
        currency,
      );
    return matchesCurrency(assets.data ?? [], currency);
  }, [isSettlement, isPayment, branchOptions, assets.data, currency]);

  const counterOptions = useMemo(() => {
    // Los dos tipos de liquidación mueven la plata contra caja o banco, que es
    // lo que cuelga de 1100 — no "cualquier ASSET".
    if (isSettlement) return matchesCurrency(branchOptions.cash, currency);
    const pool = ASSET_ONLY_TYPES.has(type)
      ? (assets.data ?? [])
      : (postable.data ?? []).filter((a) => a.type === 'ASSET' || a.type === 'LIABILITY');
    // El destino de una transferencia SÍ puede estar en otra moneda: es
    // exactamente el caso que el backend resuelve con `counterAmount`. Filtrarlo
    // por la moneda del movimiento dejaba la conversión fuera del panel.
    return isTransfer ? pool : matchesCurrency(pool, currency);
  }, [type, isTransfer, isSettlement, branchOptions, currency, assets.data, postable.data]);

  // Una cuenta en colones no puede recibir una línea en dólares: el backend la
  // rechaza con 409 ACCOUNT_CURRENCY_MISMATCH. Al cambiar la moneda, la cuenta
  // que dejó de servir se limpia sola en vez de esperar al submit.
  const validIds = useMemo(
    () => new Set([...originOptions, ...counterOptions].map((a) => a.id)),
    [originOptions, counterOptions],
  );
  useEffect(() => {
    // Un movimiento asentado tiene sus cuentas congeladas: limpiarlas acá vaciaría
    // el selector de un dato que el backend ya no acepta cambiar (ENTRY_POSTED_IMMUTABLE)
    // y lo mostraría en blanco como si nunca hubiera tenido cuenta.
    if (lockAccounting || accountsLoading || accountsError) return;
    for (const field of ['accountId', 'counterAccountId'] as const) {
      const chosen = form.getValues(field);
      if (chosen && !validIds.has(chosen)) {
        form.setValue(field, '');
        void form.trigger(field);
      }
    }
  }, [validIds, lockAccounting, accountsLoading, accountsError, form]);

  // Dejar de ser una conversión (cambió el destino, o el tipo) no puede dejar el
  // monto recibido escondido en el estado: el backend responde 409
  // COUNTER_AMOUNT_NOT_APPLICABLE si viaja donde no corresponde.
  useEffect(() => {
    if (lockAccounting || crossCurrency) return;
    if (form.getValues('counterAmount')) form.setValue('counterAmount', '');
  }, [crossCurrency, lockAccounting, form]);

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
          // Solo cuando la transferencia cambia de moneda: en cualquier otro
          // movimiento el backend lo rechaza en vez de ignorarlo.
          ...(crossCurrency ? { counterAmount: v.counterAmount } : {}),
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

          {hasUnmappedCategory && (
            <Alert>
              <AlertDescription>
                Hay categorías sin cuenta contable.{' '}
                <Link href="/finance/categorias">
                  Asignalas en Categorías.
                </Link>
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
                    <FieldDescription>{MOVEMENT_TYPE_HINTS[field.value]}</FieldDescription>
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
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={lockAccounting}
                    >
                      <SelectTrigger id="fe-category" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Elegí una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {cats.map((c) => (
                          <SelectItem
                            key={c.id}
                            value={c.id}
                            disabled={needsCategoryAccount && !c.accountId}
                          >
                            {needsCategoryAccount && !c.accountId
                              ? `${c.name} — sin cuenta contable`
                              : c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isSettlement && (
                      <FieldDescription>
                        Solo etiqueta el movimiento: el asiento sale de las dos cuentas.
                      </FieldDescription>
                    )}
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
              {needsBothAccounts && (
                <Controller
                  name="accountId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="fe-account">{originLabel(type)}</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={lockAccounting || accountsLoading || accountsError}
                      >
                        <SelectTrigger id="fe-account" aria-invalid={fieldState.invalid}>
                          <SelectValue
                            placeholder={
                              accountsLoading ? 'Cargando cuentas…' : originLabel(type)
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <AccountItems accounts={originOptions} />
                        </SelectContent>
                      </Select>
                      <FieldDescription>{originHint(type)}</FieldDescription>
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
                    <FieldLabel htmlFor="fe-counter">{counterLabel(type)}</FieldLabel>
                    {/* Donde las dos cuentas son obligatorias no hay default, así
                        que arranca vacío con placeholder: caer en el sentinel sin
                        su SelectItem dejaba el trigger en blanco. */}
                    <Select
                      value={
                        needsBothAccounts || accountsLoading
                          ? field.value
                          : field.value || DEFAULT_ACCOUNT
                      }
                      onValueChange={(v) => field.onChange(v === DEFAULT_ACCOUNT ? '' : v)}
                      disabled={lockAccounting || accountsLoading || accountsError}
                    >
                      <SelectTrigger id="fe-counter" aria-invalid={fieldState.invalid}>
                        <SelectValue
                          placeholder={accountsLoading ? 'Cargando cuentas…' : counterLabel(type)}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {!needsBothAccounts && (
                          <SelectItem value={DEFAULT_ACCOUNT}>
                            Por clasificar (predeterminada)
                          </SelectItem>
                        )}
                        <AccountItems accounts={counterOptions} />
                      </SelectContent>
                    </Select>
                    <FieldDescription>{counterHint(type)}</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            {crossCurrency && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="counterAmount"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="fe-counter-amount">
                        Monto recibido{destinationCurrency && ` (${destinationCurrency})`}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="fe-counter-amount"
                        inputMode="decimal"
                        autoComplete="off"
                        disabled={lockAccounting}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldDescription>
                        Las dos cuentas están en monedas distintas: el monto de arriba es lo que
                        SALE y este es lo que LLEGÓ. La diferencia contra el tipo de cambio del día
                        se registra en 6520 Diferencial cambiario.
                      </FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            )}

            {accountsError && (
              <Alert variant="destructive">
                <AlertDescription className="flex flex-wrap items-center gap-3">
                  <span>No se pudo cargar el plan de cuentas.</span>
                  <Button type="button" variant="outline" size="sm" onClick={retryAccounts}>
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            )}
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
