'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  FileTextIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { FINANCE_CURRENCIES } from '@/hooks/use-finance';
import {
  TAX_DECLARATION_STATUSES,
  useTaxDeclaration,
  useTaxDeclarationMutations,
  useTaxDeclarations,
  type TaxDeclaration,
  type TaxDeclarationStatus,
} from '@/hooks/use-finance-tax';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/lib/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  MONTH_OPTIONS,
  TAX_DECLARATION_STATUS_BADGE,
  TAX_DECLARATION_STATUS_HINTS,
  TAX_DECLARATION_STATUS_LABELS,
  TAX_DECLARATION_TRANSITION_LABELS,
  formatAmount,
  formatPeriod,
  monthName,
} from './finance-format';

const ALL = '__all__';
const PAGE_SIZE = 20;

/** Los últimos 24 meses, del más nuevo al más viejo. Un mes futuro no tiene mayor. */
function recentMonths(): { year: number; month: number }[] {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

// Solo estos dos estados admiten recalcular: una declaración presentada ya se
// entregó, y recalcularla dejaría el papel de trabajo diciendo otra cosa que lo
// presentado.
const RECALCULABLE: readonly TaxDeclarationStatus[] = ['DRAFT', 'REVIEW'];

/**
 * Declaraciones de IVA: la lista por mes y el detalle con sus cifras del mayor.
 *
 * Las cifras NO se teclean: salen del libro. Lo único que se decide acá es en qué
 * estado del ciclo está la declaración, y esa es toda la razón por la que existe
 * la pantalla — no hay integración con Hacienda ni la va a haber en esta versión.
 */
export function FinanceTaxDeclarations({ canWrite = false }: { canWrite?: boolean }) {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<TaxDeclarationStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useTaxDeclarations({
    year,
    month,
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2];
  }, []);

  const columns = useMemo<ColumnDef<TaxDeclaration, unknown>[]>(
    () => [
      {
        accessorKey: 'period',
        header: 'Período',
        meta: { label: 'Período' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{formatPeriod(row.original.period)}</span>
        ),
      },
      {
        accessorKey: 'kind',
        header: 'Tipo',
        meta: { label: 'Tipo' },
        enableSorting: false,
        cell: ({ row }) => row.original.kind,
      },
      {
        id: 'estado',
        header: 'Estado',
        meta: { label: 'Estado' },
        enableSorting: false,
        cell: ({ row }) => {
          const badge = TAX_DECLARATION_STATUS_BADGE[row.original.status];
          return (
            <div className="flex flex-wrap gap-1">
              <StatusBadge
                tone={badge.tone}
                icon={badge.icon}
                label={TAX_DECLARATION_STATUS_LABELS[row.original.status]}
              />
              {/* También en la lista y no solo en el detalle: es acá donde se
                  mira el mes, y una declaración vieja no se distingue de una al
                  día por su estado —las dos dicen "Presentada"—. */}
              {row.original.stale && (
                <StatusBadge tone="warning" icon={TriangleAlertIcon} label="Desactualizada" />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'taxableBase',
        header: 'Base imponible',
        meta: { label: 'Base imponible' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatAmount(row.original.taxableBase, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'taxAmount',
        header: 'Impuesto',
        meta: { label: 'Impuesto' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatAmount(row.original.taxAmount, row.original.currency)}
          </span>
        ),
      },
      {
        id: 'acciones',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-right">
            <Button variant="ghost" size="sm" onClick={() => setOpenId(row.original.id)}>
              Ver detalle
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error ? error.message : 'No se pudieron cargar las declaraciones.'}
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
              value={year === undefined ? ALL : String(year)}
              onValueChange={(v) => {
                setYear(v === ALL ? undefined : Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32" size="sm" aria-label="Filtrar por año">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los años</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={month === undefined ? ALL : String(month)}
              onValueChange={(v) => {
                setMonth(v === ALL ? undefined : Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36" size="sm" aria-label="Filtrar por mes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los meses</SelectItem>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status ?? ALL}
              onValueChange={(v) => {
                setStatus(v === ALL ? undefined : (v as TaxDeclarationStatus));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40" size="sm" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {TAX_DECLARATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TAX_DECLARATION_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canWrite && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <PlusIcon className="size-4" />
                Nueva declaración
              </Button>
            )}
          </>
        }
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        loading={isLoading}
        onPageChange={setPage}
        emptyIcon={<FileTextIcon />}
        emptyMessage={isError ? 'No se pudo cargar' : 'Todavía no hay declaraciones'}
        emptyDescription={
          isError
            ? 'Reintentá la carga para ver las declaraciones.'
            : 'Creá la del mes: la base y el impuesto salen del mayor, no se teclean.'
        }
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          {creating && <CreateDeclarationForm onDone={() => setCreating(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          {openId && <DeclarationDetail id={openId} canWrite={canWrite} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateDeclarationForm({ onDone }: { onDone: () => void }) {
  const { create } = useTaxDeclarationMutations();
  const months = useMemo(() => recentMonths(), []);
  const [selected, setSelected] = useState(0);
  const [currency, setCurrency] = useState<(typeof FINANCE_CURRENCIES)[number]>('CRC');
  const [notes, setNotes] = useState('');
  const [conflict, setConflict] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const target = months[selected] ?? months[0];

  async function submit(): Promise<void> {
    if (!target) return;
    setConflict(null);
    setSaving(true);
    try {
      await create.mutateAsync({
        year: target.year,
        month: target.month,
        kind: 'IVA',
        currency,
        notes: notes.trim() || undefined,
      });
      toast.success('Declaración creada');
      onDone();
    } catch (e) {
      // El 409 `TAX_DECLARATION_EXISTS` se corrige eligiendo otro mes, que está
      // acá adentro: el diálogo queda abierto con lo elegido.
      setConflict(e instanceof Error ? e.message : 'No se pudo crear la declaración');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nueva declaración de IVA</DialogTitle>
        <DialogDescription>
          Sin montos: la base imponible y el impuesto se calculan del libro mayor al crearla, y se
          pueden recalcular mientras siga en borrador o en revisión.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className="py-4">
        <Field>
          <FieldLabel htmlFor="decl-period">Período</FieldLabel>
          <Select value={String(selected)} onValueChange={(v) => setSelected(Number(v))}>
            <SelectTrigger id="decl-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={`${m.year}-${m.month}`} value={String(i)}>
                  {monthName(m.month)} {m.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="decl-currency">Moneda</FieldLabel>
          <Select value={currency} onValueChange={(v) => setCurrency(v as (typeof FINANCE_CURRENCIES)[number])}>
            <SelectTrigger id="decl-currency">
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
            Las líneas del mayor en otra moneda no se convierten ni se suman: quedan nombradas como
            excluidas en el detalle.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="decl-notes">Notas</FieldLabel>
          <Textarea
            id="decl-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            placeholder="Opcional"
          />
        </Field>

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
        <Button type="button" disabled={saving} onClick={() => void submit()}>
          <SaveIcon className="size-4" />
          Crear declaración
        </Button>
      </DialogFooter>
    </>
  );
}

function DeclarationDetail({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { data, isLoading, isError, error, refetch } = useTaxDeclaration(id);
  const { recalculate, transition } = useTaxDeclarationMutations();
  const [pendingTransition, setPendingTransition] = useState<TaxDeclarationStatus | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-wrap items-center gap-3">
          <span>
            {error instanceof Error ? error.message : 'No se pudo cargar la declaración.'}
          </span>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const badge = TAX_DECLARATION_STATUS_BADGE[data.status];
  const editable = RECALCULABLE.includes(data.status);
  const terminal = data.allowedTransitions.length === 0;
  // Con el período reabierto, las cifras congeladas ya no describen el mayor:
  // avanzar de estado sellaría un número que sabemos viejo. Recalcular sí, y por
  // eso el botón sigue disponible donde el contrato lo permite.
  const transitions = data.stale ? [] : data.allowedTransitions;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Declaración de {data.kind} · {formatPeriod(data.period)}
        </DialogTitle>
        <DialogDescription>{TAX_DECLARATION_STATUS_HINTS[data.status]}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge
            tone={badge.tone}
            icon={badge.icon}
            label={TAX_DECLARATION_STATUS_LABELS[data.status]}
          />
          {data.stale && (
            <StatusBadge tone="warning" icon={TriangleAlertIcon} label="Desactualizada" />
          )}
          <span className="text-muted-foreground text-sm">
            Calculada el {new Date(data.calculatedAt).toLocaleString('es-CR')}
          </span>
          {data.filedAt && (
            <span className="text-muted-foreground text-sm">
              Presentada el {new Date(data.filedAt).toLocaleString('es-CR')}
            </span>
          )}
        </div>

        {terminal && (
          <Alert>
            <AlertTitle>Solo lectura</AlertTitle>
            <AlertDescription>
              Una declaración cerrada es terminal e inmutable: no se recalcula ni admite ninguna
              transición más.
            </AlertDescription>
          </Alert>
        )}

        {data.stale && (
          <Alert variant="destructive">
            {/* El título NO repite la palabra del badge: dice el HECHO que la
                dejó vieja, que es lo que hay que entender para decidir. */}
            <AlertTitle>El período se reabrió después de presentarla</AlertTitle>
            <AlertDescription>
              Las cifras de abajo son las que se congelaron entonces, no las que dice el mayor hoy.
              No se puede avanzar de estado hasta recalcularla
              {editable ? '.' : ': volvela a borrador desde el período reabierto.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Figure label="Base imponible" value={formatAmount(data.taxableBase, data.currency)} />
          <Figure
            label="Impuesto del período"
            value={formatAmount(data.taxAmount, data.currency)}
            emphasis
          />
          <Figure
            label="IVA repercutido (cobrado)"
            value={formatAmount(data.ivaRepercutido, data.currency)}
            hint="Créditos a la cuenta 2220 del período, en bruto: no se netea contra los pagos."
          />
          <Figure
            label="Débitos a la cuenta del impuesto"
            value={formatAmount(data.taxDebits, data.currency)}
            hint="Pagos a Hacienda y notas de crédito. Informativo: NO se restan del impuesto declarado."
          />
        </div>

        {/* El literal viene del backend a propósito: es la advertencia que el
            contador tiene que leer, y reescribirla acá la dejaría desfasada. */}
        <Alert>
          <AlertTitle>IVA soportado (compras): N/A</AlertTitle>
          <AlertDescription>{data.ivaSoportadoNote}</AlertDescription>
        </Alert>

        {data.snapshot.excludedCurrencies.length > 0 && (
          <Alert>
            <AlertTitle>Monedas excluidas</AlertTitle>
            <AlertDescription>
              Estas monedas tuvieron IVA en el período y no se sumaron: convertirlas con la tasa de
              hoy inventaría un impuesto que nadie recaudó.{' '}
              {data.snapshot.excludedCurrencies
                .map((c) => formatAmount(c.taxAmount, c.currency))
                .join(' · ')}
            </AlertDescription>
          </Alert>
        )}

        {data.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notas</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{data.notes}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Líneas del mayor · cuenta {data.snapshot.taxAccountCode}
            </CardTitle>
            <CardDescription>
              Congeladas al calcular: es el papel de trabajo de esta declaración, no una consulta en
              vivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.snapshot.lines.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                El período no tuvo movimientos en la cuenta del impuesto.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asiento</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">IVA cobrado</TableHead>
                      <TableHead className="text-right">IVA debitado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.snapshot.lines.map((line) => (
                      <TableRow key={line.entryId}>
                        <TableCell className="font-mono text-xs">{line.entryNumber}</TableCell>
                        <TableCell className="tabular-nums">{line.date}</TableCell>
                        <TableCell className="max-w-xs break-words">{line.description}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatAmount(line.base, data.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatAmount(line.taxCredit, data.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatAmount(line.taxDebit, data.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canWrite && (
        <DialogFooter className="flex-wrap gap-2">
          {editable && (
            <Button
              type="button"
              variant="outline"
              disabled={recalculate.isPending}
              onClick={async () => {
                try {
                  await recalculate.mutateAsync(data.id);
                  toast.success('Declaración recalculada contra el mayor');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'No se pudo recalcular');
                }
              }}
            >
              <RefreshCwIcon className="size-4" />
              Recalcular
            </Button>
          )}
          {transitions.map((to) => (
            <Button key={to} type="button" onClick={() => setPendingTransition(to)}>
              {TAX_DECLARATION_TRANSITION_LABELS[to]}
            </Button>
          ))}
        </DialogFooter>
      )}

      <ConfirmDialog
        open={!!pendingTransition}
        onOpenChange={(open) => !open && setPendingTransition(null)}
        title={
          pendingTransition ? TAX_DECLARATION_TRANSITION_LABELS[pendingTransition] : 'Confirmar'
        }
        description={pendingTransition ? transitionWarning(pendingTransition) : undefined}
        // El motivo es opcional en el contrato, pero el campo queda a la vista:
        // la nota es lo que queda en la auditoría explicando la transición.
        requireReason={false}
        confirmLabel={
          pendingTransition ? TAX_DECLARATION_TRANSITION_LABELS[pendingTransition] : 'Confirmar'
        }
        onConfirm={async () => {
          if (!pendingTransition) return;
          await transition.mutateAsync({ id: data.id, to: pendingTransition });
          toast.success(`Declaración en ${TAX_DECLARATION_STATUS_LABELS[pendingTransition]}`);
          setPendingTransition(null);
        }}
      />
    </>
  );
}

function transitionWarning(to: TaxDeclarationStatus): string {
  switch (to) {
    case 'DRAFT':
      return 'Vuelve a borrador. Es la única vuelta atrás del ciclo y sigue siendo recalculable.';
    case 'REVIEW':
      return 'Pasa a revisión. Se sigue pudiendo recalcular y volver a borrador si aparece un error.';
    case 'FILED':
      return 'Queda marcada como presentada, con la fecha y quién la presentó. Deja de poder recalcularse.';
    case 'CLOSED':
      return 'Cerrar es definitivo: la declaración queda inmutable y no admite ninguna transición más.';
  }
}

function Figure({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={emphasis ? 'text-2xl tabular-nums' : 'text-lg tabular-nums'}>
          {value}
        </CardTitle>
      </CardHeader>
      {hint && <CardContent className="text-muted-foreground text-xs">{hint}</CardContent>}
    </Card>
  );
}
