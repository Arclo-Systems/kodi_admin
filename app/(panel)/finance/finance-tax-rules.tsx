'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { PencilIcon, PercentIcon, PlusIcon, SaveIcon, TicketXIcon } from 'lucide-react';
import {
  TAX_APPLIES_TO,
  useTaxRuleMutations,
  useTaxRules,
  type TaxAppliesTo,
  type TaxRule,
} from '@/hooks/use-finance-tax';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/lib/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DatePicker, toYMD } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CircleCheckIcon, CircleSlashIcon } from 'lucide-react';
import { TAX_APPLIES_TO_HINTS, TAX_APPLIES_TO_LABELS, formatRate } from './finance-format';

const ALL = '__all__';

// El mismo criterio que `zTaxRate()` en el backend: una FRACCIÓN entre 0 y 1 con
// hasta 4 decimales. `13` se rechaza acá y no en el 400 del servidor porque es
// el dedazo más probable —teclear el porcentaje en vez de la fracción— y quien
// lo comete tiene que verlo al lado del campo.
const RATE_RE = /^[01](\.\d{1,4})?$/;

const RateField = z
  .string()
  .min(1, 'Requerido')
  .regex(RATE_RE, 'Una fracción entre 0 y 1: el 13 % se escribe "0.13"');

const CreateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, 'Mínimo 2 caracteres')
      .max(40, 'Máximo 40 caracteres')
      .regex(/^[A-Z0-9_]+$/, 'Mayúsculas, dígitos y guion bajo (ej. "IVA_CR")'),
    name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(120, 'Máximo 120 caracteres'),
    rate: RateField,
    appliesTo: z.enum(TAX_APPLIES_TO),
    validFrom: z.string().min(1, 'Requerido'),
    validTo: z.string(),
  })
  // Una vigencia invertida es un 409 del backend; acá no llega a salir.
  .refine((v) => !v.validTo || v.validTo >= v.validFrom, {
    path: ['validTo'],
    message: 'El fin no puede ser anterior al inicio',
  });

type CreateValues = z.infer<typeof CreateSchema>;

export function FinanceTaxRules({ canWrite = false }: { canWrite?: boolean }) {
  const [appliesTo, setAppliesTo] = useState<TaxAppliesTo | undefined>(undefined);
  const [onlyActive, setOnlyActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TaxRule | null>(null);
  const [toDeactivate, setToDeactivate] = useState<TaxRule | null>(null);

  const { data, isLoading, isError, error, refetch } = useTaxRules({
    appliesTo,
    isActive: onlyActive ? true : undefined,
  });
  const { deactivate } = useTaxRuleMutations();

  const columns = useMemo<ColumnDef<TaxRule, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Código',
        meta: { label: 'Código' },
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono font-medium">{row.original.code}</span>,
      },
      {
        accessorKey: 'name',
        header: 'Nombre',
        meta: { label: 'Nombre' },
        enableSorting: false,
        cell: ({ row }) => <span className="break-words">{row.original.name}</span>,
      },
      {
        accessorKey: 'rate',
        header: 'Tasa',
        meta: { label: 'Tasa' },
        enableSorting: false,
        // Se muestra en por ciento porque es como se habla del IVA, y la
        // fracción exacta al lado porque es lo que está guardado.
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatRate(row.original.rate)}
            <span className="text-muted-foreground ml-2 text-xs">{row.original.rate}</span>
          </span>
        ),
      },
      {
        accessorKey: 'appliesTo',
        header: 'Aplica a',
        meta: { label: 'Aplica a' },
        enableSorting: false,
        cell: ({ row }) => TAX_APPLIES_TO_LABELS[row.original.appliesTo],
      },
      {
        id: 'vigencia',
        header: 'Vigencia',
        meta: { label: 'Vigencia' },
        enableSorting: false,
        // Ya son días civiles: pasarlos por `new Date` los correría un día en
        // cualquier zona al oeste de UTC.
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.validFrom} →{' '}
            {row.original.validTo ?? (
              <span className="text-muted-foreground">sin fecha de fin</span>
            )}
          </span>
        ),
      },
      {
        id: 'estado',
        header: 'Estado',
        meta: { label: 'Estado' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge tone="success" icon={CircleCheckIcon} label="Activa" />
          ) : (
            <StatusBadge tone="muted" icon={CircleSlashIcon} label="Retirada" />
          ),
      },
      {
        id: 'acciones',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) =>
          canWrite ? (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(row.original)}>
                <PencilIcon className="size-4" />
                Editar
              </Button>
              {row.original.isActive && (
                <Button variant="ghost" size="sm" onClick={() => setToDeactivate(row.original)}>
                  <TicketXIcon className="size-4" />
                  Retirar
                </Button>
              )}
            </div>
          ) : null,
      },
    ],
    [canWrite],
  );

  const rules = data ?? [];

  return (
    <div className="space-y-4">
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error ? error.message : 'No se pudieron cargar las tarifas.'}
            </span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <DataTable
        toolbar={
          <>
            <Select
              value={appliesTo ?? ALL}
              onValueChange={(v) => setAppliesTo(v === ALL ? undefined : (v as TaxAppliesTo))}
            >
              <SelectTrigger className="w-52" size="sm" aria-label="Filtrar por ámbito">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los ámbitos</SelectItem>
                {TAX_APPLIES_TO.map((a) => (
                  <SelectItem key={a} value={a}>
                    {TAX_APPLIES_TO_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={onlyActive ? 'active' : 'all'}
              onValueChange={(v) => setOnlyActive(v === 'active')}
            >
              <SelectTrigger className="w-44" size="sm" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Solo activas</SelectItem>
                <SelectItem value="all">Activas y retiradas</SelectItem>
              </SelectContent>
            </Select>
            {canWrite && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <PlusIcon className="size-4" />
                Nueva tarifa
              </Button>
            )}
          </>
        }
        columns={columns}
        data={rules}
        total={rules.length}
        page={1}
        pageSize={rules.length || 1}
        loading={isLoading}
        onPageChange={() => {}}
        emptyIcon={<PercentIcon />}
        emptyMessage={isError ? 'No se pudo cargar' : 'Todavía no hay tarifas cargadas'}
        emptyDescription={
          isError
            ? 'Reintentá la carga para ver las tarifas.'
            : 'Sin una tarifa vigente para facturas de sponsor, emitir una factura con IVA responde 409.'
        }
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          {creating && <TaxRuleForm onDone={() => setCreating(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && <TaxRuleForm rule={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDeactivate}
        onOpenChange={(open) => !open && setToDeactivate(null)}
        title="Retirar la tarifa"
        description={
          toDeactivate
            ? `${toDeactivate.code} (${formatRate(toDeactivate.rate)}, ${TAX_APPLIES_TO_LABELS[toDeactivate.appliesTo]}) deja de regir. No se borra: las facturas que ya la usaron siguen respaldadas. Si no queda ninguna vigente para ese ámbito, facturar con IVA va a responder 409.`
            : undefined
        }
        destructive
        confirmLabel="Retirar tarifa"
        onConfirm={async () => {
          if (!toDeactivate) return;
          await deactivate.mutateAsync(toDeactivate.id);
          toast.success('Tarifa retirada');
          setToDeactivate(null);
        }}
      />
    </div>
  );
}

/**
 * Alta y edición de una tarifa.
 *
 * La diferencia entre las dos es del contrato y es una sola: **`code` y
 * `appliesTo` son inmutables**. Son la llave (`@@unique`), y mudar una tarifa de
 * ámbito cambiaría retroactivamente qué facturas la usaron sin dejar rastro. Al
 * editar se muestran, no se ofrecen, y no viajan en el `PATCH`.
 */
function TaxRuleForm({ rule, onDone }: { rule?: TaxRule; onDone: () => void }) {
  const { create, update } = useTaxRuleMutations();
  const [conflict, setConflict] = useState<string | null>(null);

  const form = useForm<CreateValues>({
    resolver: zodResolver(CreateSchema),
    defaultValues: rule
      ? {
          code: rule.code,
          name: rule.name,
          rate: rule.rate,
          appliesTo: rule.appliesTo,
          validFrom: rule.validFrom,
          validTo: rule.validTo ?? '',
        }
      : {
          code: '',
          name: '',
          rate: '',
          appliesTo: 'SPONSOR_INVOICE',
          validFrom: toYMD(new Date()),
          validTo: '',
        },
  });

  async function submit(v: CreateValues): Promise<void> {
    setConflict(null);
    try {
      if (rule) {
        await update.mutateAsync({
          id: rule.id,
          input: {
            name: v.name.trim(),
            rate: v.rate,
            validFrom: v.validFrom,
            validTo: v.validTo || null,
          },
        });
        toast.success('Tarifa actualizada');
      } else {
        await create.mutateAsync({
          code: v.code.trim(),
          name: v.name.trim(),
          rate: v.rate,
          appliesTo: v.appliesTo,
          validFrom: v.validFrom,
          validTo: v.validTo || null,
        });
        toast.success('Tarifa creada');
      }
      onDone();
    } catch (e) {
      // El 409 `TAX_RULE_OVERLAP` nombra la tarifa que está en el medio y con
      // qué vigencia. Se muestra en el formulario porque es ahí donde se corrige
      // —moviendo el inicio, o cerrando primero la vieja con `validTo`—.
      setConflict(e instanceof Error ? e.message : 'No se pudo guardar la tarifa');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <DialogHeader>
        <DialogTitle>{rule ? 'Editar tarifa' : 'Nueva tarifa de impuesto'}</DialogTitle>
        <DialogDescription>
          Para reemplazar una tarifa vigente: primero cerrá la vieja con una fecha de fin, después
          creá la nueva. Dos vigencias que se pisan en el mismo ámbito se rechazan.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className="py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rule ? (
            <Field>
              <FieldTitle>Código</FieldTitle>
              <p className="font-mono font-medium">{rule.code}</p>
              <FieldDescription>
                No se puede cambiar: es la llave con la que las facturas emitidas referencian esta
                tarifa.
              </FieldDescription>
            </Field>
          ) : (
            <Controller
              name="code"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="tax-code">Código</FieldLabel>
                  <Input
                    {...field}
                    id="tax-code"
                    autoComplete="off"
                    placeholder="IVA_CR"
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>Mayúsculas, sin espacios.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}

          {rule ? (
            <Field>
              <FieldTitle>Aplica a</FieldTitle>
              <p className="font-medium">{TAX_APPLIES_TO_LABELS[rule.appliesTo]}</p>
              <FieldDescription>{TAX_APPLIES_TO_HINTS[rule.appliesTo]}</FieldDescription>
            </Field>
          ) : (
            <Controller
              name="appliesTo"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="tax-applies-to">Aplica a</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tax-applies-to">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_APPLIES_TO.map((a) => (
                        <SelectItem key={a} value={a}>
                          {TAX_APPLIES_TO_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* `field.value` y no `form.watch()`: el Controller ya
                      re-renderiza con el valor actual, y `watch()` devuelve una
                      función que el compilador de React no puede memoizar. */}
                  <FieldDescription>{TAX_APPLIES_TO_HINTS[field.value]}</FieldDescription>
                </Field>
              )}
            />
          )}
        </div>

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="tax-name">Nombre</FieldLabel>
              <Input
                {...field}
                id="tax-name"
                maxLength={120}
                autoComplete="off"
                placeholder="IVA Costa Rica 13 %"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="rate"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="tax-rate">Tasa</FieldLabel>
              <Input
                {...field}
                id="tax-rate"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.13"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Fracción entre 0 y 1, hasta 4 decimales. El 13 % se escribe 0.13.
                {RATE_RE.test(field.value) && ` Equivale a ${formatRate(field.value)}.`}
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="validFrom"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tax-valid-from">Vigente desde</FieldLabel>
                <DatePicker
                  id="tax-valid-from"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="validTo"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tax-valid-to">Vigente hasta</FieldLabel>
                <DatePicker
                  id="tax-valid-to"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={fieldState.invalid}
                />
                <FieldDescription>Vacío = vigente hasta nuevo aviso.</FieldDescription>
                {field.value && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() => field.onChange('')}
                  >
                    Quitar la fecha de fin
                  </Button>
                )}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        {conflict && (
          <Alert variant="destructive">
            <AlertDescription>{conflict}</AlertDescription>
          </Alert>
        )}
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <SaveIcon className="size-4" />
          {rule ? 'Guardar cambios' : 'Crear tarifa'}
        </Button>
      </DialogFooter>
    </form>
  );
}
