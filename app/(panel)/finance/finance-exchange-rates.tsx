'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { PlusIcon, SaveIcon, Trash2Icon, TrendingUpIcon } from 'lucide-react';
import {
  FINANCE_CURRENCIES,
  useExchangeRateMutations,
  useExchangeRates,
  type ExchangeRate,
  type ExchangeRateListQuery,
} from '@/hooks/use-finance';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = '__all__';
const PAGE_SIZE = 20;

// El mismo regex que `zRate()` en el backend: hasta 10 enteros y 8 decimales. Con
// dos decimales el colón contra el dólar (0.00196078) se redondearía a cero, así
// que este NO es el formato de un importe.
const RATE_RE = /^\d{1,10}(\.\d{1,8})?$/;

const FormSchema = z
  .object({
    date: z.string().min(1, 'Requerido'),
    fromCurrency: z.enum(FINANCE_CURRENCIES),
    toCurrency: z.enum(FINANCE_CURRENCIES),
    rate: z
      .string()
      .min(1, 'Requerido')
      .regex(RATE_RE, 'Hasta 8 decimales')
      // El string no se pasa por `Number` para nada más que esta comprobación de
      // signo: el valor que viaja al backend es el que se tecleó.
      .refine((v) => Number(v) > 0, 'Mayor a 0'),
    source: z.string().trim().min(1, 'Requerido').max(120, 'Máximo 120 caracteres'),
  })
  // Convertir una moneda a sí misma es un 1 disfrazado: cargado con otro valor
  // rompería todo consolidado a esa moneda.
  .refine((v) => v.fromCurrency !== v.toCurrency, {
    path: ['toCurrency'],
    message: 'Elegí dos monedas distintas',
  });

type FormValues = z.infer<typeof FormSchema>;

const pairLabel = (rate: ExchangeRate) => `${rate.fromCurrency} → ${rate.toCurrency}`;

/**
 * Los tipos de cambio se cargan a mano: no hay proveedor conectado.
 *
 * Por eso la fuente es obligatoria (es lo único que hace auditable el número
 * meses después) y por eso los reportes usan la última tasa con fecha anterior o
 * igual al corte, en vez de exigir una por día.
 */
export function FinanceExchangeRates({ canWrite = false }: { canWrite?: boolean }) {
  const [fromCurrency, setFromCurrency] = useState<string | undefined>(undefined);
  const [toCurrency, setToCurrency] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<ExchangeRate | null>(null);

  const query: ExchangeRateListQuery = { fromCurrency, toCurrency, page, pageSize };
  const { data, isLoading, isError, error, refetch } = useExchangeRates(query);
  const { remove } = useExchangeRateMutations();

  const columns = useMemo<ColumnDef<ExchangeRate, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Fecha',
        meta: { label: 'Fecha' },
        enableSorting: false,
        // Ya viene como día civil ('YYYY-MM-DD'): pasarlo por `new Date` lo
        // correría un día en cualquier zona al oeste de UTC.
        cell: ({ row }) => <span className="tabular-nums">{row.original.date}</span>,
      },
      {
        id: 'par',
        header: 'Par',
        meta: { label: 'Par' },
        enableSorting: false,
        cell: ({ row }) => <span className="font-medium">{pairLabel(row.original)}</span>,
      },
      {
        accessorKey: 'rate',
        header: 'Tasa',
        meta: { label: 'Tasa' },
        enableSorting: false,
        // Sin `formatMoney`: no es plata, son ocho decimales de un factor y
        // agruparlos con coma decimal los volvería ilegibles.
        cell: ({ row }) => <span className="tabular-nums">{row.original.rate}</span>,
      },
      {
        accessorKey: 'source',
        header: 'Fuente',
        meta: { label: 'Fuente' },
        enableSorting: false,
        cell: ({ row }) => <span className="break-words">{row.original.source}</span>,
      },
      {
        id: 'quien',
        header: 'Quién la cargó',
        meta: { label: 'Quién la cargó' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {new Date(row.original.createdAt).toLocaleDateString('es-CR')}
            {row.original.createdBy && (
              <span className="ml-2 font-mono break-all">{row.original.createdBy}</span>
            )}
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
            <div className="text-right">
              <Button variant="ghost" size="sm" onClick={() => setToDelete(row.original)}>
                <Trash2Icon className="size-4" />
                Borrar
              </Button>
            </div>
          ) : null,
      },
    ],
    [canWrite],
  );

  return (
    <div className="space-y-4">
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error ? error.message : 'No se pudieron cargar los tipos de cambio.'}
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
            <CurrencyFilter
              label="Filtrar por moneda de origen"
              value={fromCurrency}
              onChange={(v) => {
                setFromCurrency(v);
                setPage(1);
              }}
            />
            <CurrencyFilter
              label="Filtrar por moneda de destino"
              value={toCurrency}
              onChange={(v) => {
                setToCurrency(v);
                setPage(1);
              }}
            />
            {canWrite && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <PlusIcon className="size-4" />
                Nueva tasa
              </Button>
            )}
          </>
        }
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        emptyIcon={<TrendingUpIcon />}
        // Con la lista caída la tabla también queda sin filas: decir "no hay
        // tasas" ahí manda a cargar una que quizá ya está.
        emptyMessage={isError ? 'No se pudo cargar' : 'Todavía no hay tipos de cambio cargados'}
        emptyDescription={
          isError
            ? 'Reintentá la carga para ver las tasas.'
            : 'Sin al menos una tasa, el consolidado de los reportes muestra N/A en vez de convertir.'
        }
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          {creating && <ExchangeRateForm onDone={() => setCreating(false)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Borrar el tipo de cambio"
        description={
          toDelete
            ? `${pairLabel(toDelete)} del ${toDelete.date} a ${toDelete.rate}. Los reportes consolidados que la usaban van a pasar a la tasa anterior, o a N/A si no hay ninguna.`
            : undefined
        }
        destructive
        confirmLabel="Borrar tasa"
        onConfirm={async () => {
          if (!toDelete) return;
          await remove.mutateAsync(toDelete.id);
          toast.success('Tipo de cambio borrado');
          setToDelete(null);
        }}
      />
    </div>
  );
}

function CurrencyFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger className="w-40" size="sm" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Todas</SelectItem>
        {FINANCE_CURRENCIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ExchangeRateForm({ onDone }: { onDone: () => void }) {
  const { create } = useExchangeRateMutations();
  const [conflict, setConflict] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      date: toYMD(new Date()),
      fromCurrency: 'CRC',
      toCurrency: 'USD',
      rate: '',
      source: '',
    },
  });

  async function submit(v: FormValues): Promise<void> {
    setConflict(null);
    try {
      await create.mutateAsync({
        date: v.date,
        fromCurrency: v.fromCurrency,
        toCurrency: v.toCurrency,
        rate: v.rate,
        source: v.source.trim(),
      });
      toast.success('Tipo de cambio cargado');
      onDone();
    } catch (e) {
      // El 409 EXCHANGE_RATE_EXISTS dice qué día y qué par están ocupados y qué
      // hacer: se muestra en el formulario, que es donde se puede corregir.
      setConflict(e instanceof Error ? e.message : 'No se pudo cargar el tipo de cambio');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <DialogHeader>
        <DialogTitle>Nueva tasa</DialogTitle>
        <DialogDescription>
          Cuántas unidades de la moneda de destino da UNA de la de origen. Se usa en las
          conversiones reales y en el consolidado de los reportes.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className="py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Controller
            name="date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="er-date">Fecha</FieldLabel>
                <DatePicker
                  id="er-date"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="fromCurrency"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="er-from">De</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="er-from">
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
            name="toCurrency"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="er-to">A</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="er-to" aria-invalid={fieldState.invalid}>
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
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="rate"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="er-rate">Tasa</FieldLabel>
              <Input
                {...field}
                id="er-rate"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00196078"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Hasta 8 decimales. Con dos, el colón contra el dólar se redondearía a cero.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="source"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="er-source">Fuente</FieldLabel>
              <Input
                {...field}
                id="er-source"
                maxLength={120}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                De dónde salió: &quot;BCCR venta 2026-09-05&quot;. Es lo único que hace auditable el
                número meses después.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

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
          Cargar tasa
        </Button>
      </DialogFooter>
    </form>
  );
}
