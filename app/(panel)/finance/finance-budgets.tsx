'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ListChecksIcon,
  PlusIcon,
  TargetIcon,
} from 'lucide-react';
import { FINANCE_CURRENCIES } from '@/hooks/use-finance';
import {
  BUDGET_STATUSES,
  useBudgetMutations,
  useBudgets,
  type BudgetStatus,
  type BudgetSummary,
} from '@/hooks/use-finance-planning';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge } from '@/lib/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  BUDGET_STATUS_LABELS,
  BUDGET_STATUS_TONE,
  MONTH_OPTIONS,
  formatAmount,
  formatPeriod,
  monthName,
} from './finance-format';
import { FinanceBudgetLinesDialog } from './finance-budget-lines-dialog';

const ALL = '__all__';
const PAGE_SIZE = 20;
const YEARS_OFFERED = 3;

const BUDGET_STATUS_ICON = {
  DRAFT: ListChecksIcon,
  ACTIVE: TargetIcon,
  ARCHIVED: ArchiveIcon,
} as const;

const CreateSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  currency: z.enum(FINANCE_CURRENCIES),
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(120, 'Máximo 120 caracteres'),
  // Nace VIGENTE: un presupuesto se crea para usarlo, y solo el vigente entra en
  // la alerta de sobregiro. El borrador queda para quien lo pida a propósito.
  status: z.enum(['ACTIVE', 'DRAFT']),
});

type CreateForm = z.infer<typeof CreateSchema>;

/**
 * Los presupuestos por mes y moneda.
 *
 * Hay UNO por (año, mes, moneda) y no se borra: se archiva. La variación de un
 * mes pasado tiene que seguir dando lo mismo dentro de un año, y borrar la fila
 * la dejaría sin contra qué compararse. Archivar es reversible, porque el unique
 * impide crear otro en su lugar.
 */
export function FinanceBudgets({ canWrite = false }: { canWrite?: boolean }) {
  const [year, setYear] = useState<string>(ALL);
  const [month, setMonth] = useState<string>(ALL);
  const [currency, setCurrency] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [toArchive, setToArchive] = useState<BudgetSummary | null>(null);

  const { data, isLoading, isError, error, refetch } = useBudgets({
    year: year === ALL ? undefined : Number(year),
    month: month === ALL ? undefined : Number(month),
    currency: currency === ALL ? undefined : currency,
    status: status === ALL ? undefined : (status as BudgetStatus),
    page,
    pageSize,
  });
  const { archive, update } = useBudgetMutations();

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: YEARS_OFFERED }, (_, i) => current + 1 - i);
  }, []);

  const columns = useMemo<ColumnDef<BudgetSummary, unknown>[]>(
    () => [
      {
        id: 'periodo',
        header: 'Período',
        meta: { label: 'Período' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{formatPeriod(row.original.period)}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Nombre',
        meta: { label: 'Nombre' },
        enableSorting: false,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'currency',
        header: 'Moneda',
        meta: { label: 'Moneda' },
        enableSorting: false,
      },
      {
        id: 'estado',
        header: 'Estado',
        meta: { label: 'Estado' },
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge
            tone={BUDGET_STATUS_TONE[row.original.status]}
            icon={BUDGET_STATUS_ICON[row.original.status]}
            label={BUDGET_STATUS_LABELS[row.original.status]}
          />
        ),
      },
      {
        id: 'lineas',
        header: 'Líneas',
        meta: { label: 'Líneas' },
        enableSorting: false,
        cell: ({ row }) => <span className="tabular-nums">{row.original.lineCount}</span>,
      },
      {
        id: 'total',
        header: 'Total',
        meta: { label: 'Total' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatAmount(row.original.totalAmount, row.original.currency)}
          </span>
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
              <Button variant="ghost" size="sm" onClick={() => setEditing(row.original.id)}>
                Editar líneas
              </Button>
              {row.original.status === 'DRAFT' && (
                // Solo el presupuesto VIGENTE lo mira la alerta de sobregiro:
                // un borrador es un plan a medio escribir, y avisar contra él
                // sería avisar contra números que todavía se están pensando.
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void update
                      .mutateAsync({ id: row.original.id, input: { status: 'ACTIVE' } })
                      .then(() => toast.success('Presupuesto vigente.'))
                      .catch((e: unknown) =>
                        toast.error(e instanceof Error ? e.message : 'No se pudo activar'),
                      )
                  }
                >
                  <TargetIcon className="size-4" />
                  Marcar vigente
                </Button>
              )}
              {row.original.status === 'ARCHIVED' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void update
                      .mutateAsync({ id: row.original.id, input: { status: 'ACTIVE' } })
                      .then(() => toast.success('Presupuesto desarchivado.'))
                      .catch((e: unknown) =>
                        toast.error(e instanceof Error ? e.message : 'No se pudo desarchivar'),
                      )
                  }
                >
                  <ArchiveRestoreIcon className="size-4" />
                  Desarchivar
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setToArchive(row.original)}>
                  <ArchiveIcon className="size-4" />
                  Archivar
                </Button>
              )}
            </div>
          ) : null,
      },
    ],
    [canWrite, update],
  );

  return (
    <div className="space-y-4">
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error ? error.message : 'No se pudieron cargar los presupuestos.'}
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
            <FilterSelect
              label="Filtrar por año"
              value={year}
              onChange={(v) => {
                setYear(v);
                setPage(1);
              }}
              allLabel="Todos los años"
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
            />
            <FilterSelect
              label="Filtrar por mes"
              value={month}
              onChange={(v) => {
                setMonth(v);
                setPage(1);
              }}
              allLabel="Todos los meses"
              options={MONTH_OPTIONS.map((m) => ({ value: String(m.value), label: m.label }))}
            />
            <FilterSelect
              label="Filtrar por moneda"
              value={currency}
              onChange={(v) => {
                setCurrency(v);
                setPage(1);
              }}
              allLabel="Todas las monedas"
              options={FINANCE_CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
            <FilterSelect
              label="Filtrar por estado"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              allLabel="Todos los estados"
              options={BUDGET_STATUSES.map((s) => ({ value: s, label: BUDGET_STATUS_LABELS[s] }))}
            />
            {canWrite && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <PlusIcon className="size-4" />
                Nuevo presupuesto
              </Button>
            )}
          </>
        }
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        emptyIcon={<TargetIcon />}
        emptyMessage={isError ? 'No se pudo cargar' : 'No hay presupuestos'}
        emptyDescription={
          isError
            ? 'Reintentá la carga para ver los presupuestos del período.'
            : 'Creá el del mes y cargale un monto por cuenta de resultado: la variación compara contra eso.'
        }
      />

      <CreateBudgetDialog open={creating} onOpenChange={setCreating} years={years} />

      <FinanceBudgetLinesDialog
        budgetId={editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDialog
        open={!!toArchive}
        onOpenChange={(open) => !open && setToArchive(null)}
        title={`¿Archivar ${toArchive?.name ?? ''}?`}
        description="El presupuesto deja de aceptar cambios pero NO se borra: la variación de ese mes sigue comparando contra él. Se puede desarchivar."
        confirmLabel="Archivar"
        onConfirm={async () => {
          if (!toArchive) return;
          try {
            await archive.mutateAsync(toArchive.id);
            toast.success('Presupuesto archivado.');
            setToArchive(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo archivar');
          }
        }}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44" size="sm" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Alta de un presupuesto. Solo la llave y el nombre: las líneas se cargan
 * después, en el editor, porque son otra pregunta y otra pantalla.
 */
function CreateBudgetDialog({
  open,
  onOpenChange,
  years,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  years: number[];
}) {
  const { create } = useBudgetMutations();
  const now = new Date();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(CreateSchema),
    defaultValues: {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      currency: FINANCE_CURRENCIES[0],
      name: '',
      status: 'ACTIVE',
    },
  });

  async function submit(values: CreateForm): Promise<void> {
    try {
      await create.mutateAsync(values);
      toast.success('Presupuesto creado. Cargale las líneas.');
      reset();
      onOpenChange(false);
    } catch (e) {
      // El 409 `BUDGET_EXISTS` se muestra acá y no en un toast: es donde se
      // corrige el mes o la moneda que ya tienen presupuesto.
      toast.error(e instanceof Error ? e.message : 'No se pudo crear el presupuesto');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo presupuesto</DialogTitle>
          <DialogDescription>
            Uno por año, mes y moneda. El año, el mes y la moneda no se cambian después: son su
            llave.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="year"
                render={({ field }) => (
                  <Field data-invalid={!!errors.year}>
                    <FieldLabel htmlFor="budget-year">Año</FieldLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger id="budget-year" aria-label="Año">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.year && <FieldError>{errors.year.message}</FieldError>}
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="month"
                render={({ field }) => (
                  <Field data-invalid={!!errors.month}>
                    <FieldLabel htmlFor="budget-month">Mes</FieldLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger id="budget-month" aria-label="Mes">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.month && <FieldError>{errors.month.message}</FieldError>}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Field data-invalid={!!errors.currency}>
                  <FieldLabel htmlFor="budget-currency">Moneda</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="budget-currency" aria-label="Moneda">
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
                  <FieldDescription>
                    No hay presupuesto consolidado: el gasto se controla en la moneda en que se paga.
                  </FieldDescription>
                  {errors.currency && <FieldError>{errors.currency.message}</FieldError>}
                </Field>
              )}
            />

            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Field data-invalid={!!errors.status}>
                  <FieldLabel htmlFor="budget-status">Estado</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="budget-status" aria-label="Estado">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">{BUDGET_STATUS_LABELS.ACTIVE}</SelectItem>
                      <SelectItem value="DRAFT">{BUDGET_STATUS_LABELS.DRAFT}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    La variación compara contra los dos; la alerta de sobregiro, solo contra el
                    vigente.
                  </FieldDescription>
                </Field>
              )}
            />

            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="budget-name">Nombre</FieldLabel>
              <Input
                id="budget-name"
                {...register('name')}
                placeholder={`Presupuesto de ${monthName(now.getMonth() + 1).toLowerCase()}`}
                aria-invalid={!!errors.name}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando…' : 'Crear presupuesto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
