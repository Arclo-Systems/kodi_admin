'use client';

import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { SaveIcon } from 'lucide-react';
import { FINANCE_CURRENCIES, type AccountType, type FinanceAccount } from '@/hooks/use-finance';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ACCOUNT_TYPE_LABELS, accountLabel } from './finance-format';

// Radix no admite '' como valor de Select: "acepta cualquier moneda" necesita el suyo.
const MULTI = '__multi__';

// Espejo de la comprobación del backend (`ACCOUNT_CODE_CLASS_MISMATCH`): el primer
// dígito del código ES la clase, y la clase se hereda del padre. Decirlo acá evita
// un viaje al servidor para enterarse.
const TYPE_FIRST_DIGIT: Record<AccountType, string> = {
  ASSET: '1',
  LIABILITY: '2',
  EQUITY: '3',
  INCOME: '4',
  COST_OF_REVENUE: '5',
  OPERATING_EXPENSE: '6',
};

export type AccountDialogTarget =
  | { mode: 'create' }
  | { mode: 'edit'; account: FinanceAccount };

export type AccountSubmitValues = {
  id?: string;
  code: string;
  name: string;
  parentId: string;
  currency: string | null;
  allowsManualEntry: boolean;
  isActive: boolean;
};

export function FinanceAccountDialog({
  target,
  accounts,
  onOpenChange,
  onSubmit,
}: {
  target: AccountDialogTarget | null;
  accounts: FinanceAccount[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AccountSubmitValues) => Promise<void>;
}) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {target && (
          // `key`: cambiar de "nueva" a "editar 6110" tiene que reconstruir el form,
          // no reusar los valores del anterior.
          <AccountForm
            key={target.mode === 'edit' ? target.account.id : 'new'}
            target={target}
            accounts={accounts}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function schemaFor(mode: 'create' | 'edit', parents: Map<string, FinanceAccount>) {
  return z
    .object({
      code: z.string().regex(/^\d{4}$/, 'El código son 4 dígitos'),
      name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(120),
      // En edición el padre es inmutable (el backend responde 409
      // ACCOUNT_FIELD_IMMUTABLE) y una cuenta raíz no tiene: no se exige.
      parentId: mode === 'create' ? z.string().min(1, 'Elegí la cuenta padre') : z.string(),
      currency: z.string(),
      allowsManualEntry: z.boolean(),
      isActive: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (mode !== 'create') return;
      const parent = parents.get(v.parentId);
      if (!parent) return;
      const expected = TYPE_FIRST_DIGIT[parent.type];
      if (v.code.startsWith(expected)) return;
      ctx.addIssue({
        code: 'custom',
        path: ['code'],
        message: `Una cuenta de ${ACCOUNT_TYPE_LABELS[parent.type].toLowerCase()} empieza con ${expected}`,
      });
    });
}

type FormValues = z.infer<ReturnType<typeof schemaFor>>;

function AccountForm({
  target,
  accounts,
  onSubmit,
}: {
  target: AccountDialogTarget;
  accounts: FinanceAccount[];
  onSubmit: (values: AccountSubmitValues) => Promise<void>;
}) {
  const editing = target.mode === 'edit' ? target.account : undefined;
  // Colgar una cuenta de una retirada da 409 ACCOUNT_PARENT_INACTIVE.
  const parents = useMemo(() => accounts.filter((a) => a.isActive), [accounts]);
  const parentById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schemaFor(target.mode, parentById)),
    defaultValues: {
      code: editing?.code ?? '',
      name: editing?.name ?? '',
      parentId: editing?.parentId ?? '',
      currency: editing?.currency ?? MULTI,
      allowsManualEntry: editing?.allowsManualEntry ?? true,
      isActive: editing?.isActive ?? true,
    },
  });

  const parentId = useWatch({ control: form.control, name: 'parentId' });
  const parent = parentById.get(parentId);

  async function submit(v: FormValues): Promise<void> {
    try {
      await onSubmit({
        id: editing?.id,
        code: v.code,
        name: v.name.trim(),
        parentId: v.parentId,
        currency: v.currency === MULTI ? null : v.currency,
        allowsManualEntry: v.allowsManualEntry,
        isActive: v.isActive,
      });
    } catch (e) {
      // El backend nombra el conflicto (ACCOUNT_CODE_EXISTS, ACCOUNT_HAS_LINES,
      // ACCOUNT_HAS_ACTIVE_CHILDREN…) y su mensaje ya viene en español.
      toast.error(e instanceof Error ? e.message : 'Error guardando la cuenta');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <DialogHeader>
        <DialogTitle>{editing ? `Editar ${editing.code}` : 'Nueva cuenta'}</DialogTitle>
        <DialogDescription>
          {editing
            ? 'El código, la clase y la cuenta padre no se cambian: reescribirían saldos ya emitidos.'
            : 'La cuenta cuelga de una existente y hereda su clase.'}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className="py-4">
        {!editing && (
          <Controller
            name="parentId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="fa-parent">Cuenta padre</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="fa-parent" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Elegí la cuenta padre" />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {accountLabel(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {parent
                    ? `Clase heredada: ${ACCOUNT_TYPE_LABELS[parent.type]}.`
                    : 'La clase de la cuenta nueva sale de acá.'}
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}

        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="fa-code">Código</FieldLabel>
              <Input
                {...field}
                id="fa-code"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                // Inmutable en edición: es la llave con la que la cuenta figura en
                // papeles ya emitidos (el backend responde 409 si viaja).
                disabled={!!editing}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="fa-name">Nombre</FieldLabel>
              <Input {...field} id="fa-name" maxLength={120} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="currency"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="fa-currency">Moneda</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="fa-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MULTI}>Todas</SelectItem>
                  {FINANCE_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Solo caja y banco fijan una: el resto acepta cualquier moneda.
              </FieldDescription>
            </Field>
          )}
        />

        <Controller
          name="allowsManualEntry"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Switch
                id="fa-manual"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <FieldLabel htmlFor="fa-manual">Permite asientos manuales</FieldLabel>
            </Field>
          )}
        />

        {editing && (
          <Controller
            name="isActive"
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Switch id="fa-active" checked={field.value} onCheckedChange={field.onChange} />
                <FieldLabel htmlFor="fa-active">
                  {/* No hay borrar: una cuenta se retira, y su saldo histórico sigue
                      contando en los reportes. */}
                  Activa
                </FieldLabel>
              </Field>
            )}
          />
        )}
      </FieldGroup>

      <DialogFooter>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <SaveIcon className="size-4" />
          {editing ? 'Guardar' : 'Crear cuenta'}
        </Button>
      </DialogFooter>
    </form>
  );
}
