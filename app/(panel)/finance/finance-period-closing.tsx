'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarCheckIcon, LockIcon, LockOpenIcon, TriangleAlertIcon } from 'lucide-react';
import {
  usePeriodMutations,
  usePeriods,
  type AccountingPeriod,
  type PeriodBlocker,
  type PeriodStatus,
} from '@/hooks/use-finance-tax';
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
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  PERIOD_STATUS_BADGE,
  PERIOD_STATUS_LABELS,
  formatAmount,
  formatPeriod,
} from './finance-format';

const ALL = '__all__';
const REASON_MIN = 10;

/**
 * Cierre mensual: la lista de períodos con lo que cada uno tiene pendiente.
 *
 * Los `blockers` vienen **ya evaluados** en la lista, así que el botón se
 * deshabilita sin intentar el cierre y sin gastar un 409 para averiguarlo. Se
 * listan además como texto en la fila: un tooltip es el segundo canal, nunca el
 * único —quien navega con teclado o lector no puede apuntar con el mouse—.
 */
export function FinancePeriodClosing({ canWrite = false }: { canWrite?: boolean }) {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<PeriodStatus | undefined>(undefined);
  const [toClose, setToClose] = useState<AccountingPeriod | null>(null);
  const [toReopen, setToReopen] = useState<AccountingPeriod | null>(null);

  const { data, isLoading, isError, error, refetch } = usePeriods({ year, status });

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2];
  }, []);

  const columns = useMemo<ColumnDef<AccountingPeriod, unknown>[]>(
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
        id: 'estado',
        header: 'Estado',
        meta: { label: 'Estado' },
        enableSorting: false,
        cell: ({ row }) => {
          const badge = PERIOD_STATUS_BADGE[row.original.status];
          return (
            <StatusBadge
              tone={badge.tone}
              icon={badge.icon}
              label={PERIOD_STATUS_LABELS[row.original.status]}
            />
          );
        },
      },
      {
        id: 'asientos',
        header: 'Asientos',
        meta: { label: 'Asientos' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.counts.journalEntries}</span>
        ),
      },
      {
        id: 'sin-asiento',
        header: 'Movimientos sin asiento',
        meta: { label: 'Movimientos sin asiento' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.counts.unpostedEntries}</span>
        ),
      },
      {
        id: 'ordenes',
        header: 'Órdenes pendientes',
        meta: { label: 'Órdenes pendientes' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.counts.pendingPlayOrders}</span>
        ),
      },
      {
        id: 'cuadra',
        header: 'Comprobación',
        meta: { label: 'Comprobación' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.balanced ? (
            <span className="text-success text-sm">Cuadra</span>
          ) : (
            // El monto que falta se nombra: "no cuadra" a secas obliga a abrir
            // la comprobación para saber si son ₡0,01 o ₡33,33.
            <span className="text-destructive text-sm">
              No cuadra:{' '}
              {row.original.balances
                .filter((b) => b.difference !== '0.00')
                .map((b) => formatAmount(b.difference, b.currency))
                .join(' · ')}
            </span>
          ),
      },
      {
        id: 'bloqueos',
        header: 'Qué falta para cerrar',
        meta: { label: 'Qué falta para cerrar' },
        enableSorting: false,
        cell: ({ row }) => <BlockerList blockers={row.original.blockers} />,
      },
      {
        id: 'acciones',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) =>
          canWrite ? (
            <div className="flex justify-end">
              {row.original.status === 'OPEN' ? (
                <CloseButton period={row.original} onClick={() => setToClose(row.original)} />
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setToReopen(row.original)}>
                  <LockOpenIcon className="size-4" />
                  Reabrir
                </Button>
              )}
            </div>
          ) : null,
      },
    ],
    [canWrite],
  );

  const periods = data ?? [];

  return (
    <div className="space-y-4">
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error ? error.message : 'No se pudieron cargar los períodos.'}
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
              onValueChange={(v) => setYear(v === ALL ? undefined : Number(v))}
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
              value={status ?? ALL}
              onValueChange={(v) => setStatus(v === ALL ? undefined : (v as PeriodStatus))}
            >
              <SelectTrigger className="w-40" size="sm" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Abiertos y cerrados</SelectItem>
                <SelectItem value="OPEN">Solo abiertos</SelectItem>
                <SelectItem value="CLOSED">Solo cerrados</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        columns={columns}
        data={periods}
        total={periods.length}
        page={1}
        pageSize={periods.length || 1}
        loading={isLoading}
        onPageChange={() => {}}
        emptyIcon={<CalendarCheckIcon />}
        emptyMessage={isError ? 'No se pudo cargar' : 'Todavía no hay períodos'}
        emptyDescription={
          isError
            ? 'Reintentá la carga para ver los períodos.'
            : 'Un período nace con el primer asiento de su mes: cargá un movimiento y va a aparecer acá.'
        }
      />

      <Dialog open={!!toClose} onOpenChange={(open) => !open && setToClose(null)}>
        <DialogContent>
          {toClose && <ClosePeriodForm period={toClose} onDone={() => setToClose(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!toReopen} onOpenChange={(open) => !open && setToReopen(null)}>
        <DialogContent>
          {toReopen && <ReopenPeriodForm period={toReopen} onDone={() => setToReopen(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * El botón de cerrar, con el motivo por el que no se puede.
 *
 * Cuando hay bloqueos va deshabilitado dentro de un `<span>` —un botón
 * deshabilitado no emite eventos de puntero, así que Radix nunca vería el
 * hover—. El tooltip repite lo que la columna "Qué falta para cerrar" ya dice en
 * texto: es una comodidad, no el único canal.
 */
function CloseButton({ period, onClick }: { period: AccountingPeriod; onClick: () => void }) {
  if (period.blockers.length === 0) {
    return (
      <Button variant="ghost" size="sm" onClick={onClick}>
        <LockIcon className="size-4" />
        Cerrar
      </Button>
    );
  }

  // Con un único bloqueo forzable la puerta sigue abierta: el plazo fiscal no
  // puede quedar rehén de una cola de Google, y el motivo lo deja auditado.
  const onlyForceable = period.blockers.every((b) => b.forceable);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={-1} className="inline-flex">
          <Button
            variant="ghost"
            size="sm"
            disabled={!onlyForceable}
            onClick={onlyForceable ? onClick : undefined}
          >
            <LockIcon className="size-4" />
            {onlyForceable ? 'Cerrar de todos modos' : 'Cerrar'}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <ul className="list-disc space-y-1 pl-4">
          {period.blockers.map((b) => (
            <li key={b.code}>{b.message}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function BlockerList({ blockers }: { blockers: PeriodBlocker[] }) {
  if (blockers.length === 0) return <span className="text-success text-sm">Nada. Se puede cerrar.</span>;
  return (
    <ul className="space-y-1">
      {blockers.map((b) => (
        <li
          key={b.code}
          className={`flex items-start gap-1.5 text-sm ${
            b.forceable ? 'text-warning' : 'text-destructive'
          }`}
        >
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="break-words">{b.message}</span>
        </li>
      ))}
    </ul>
  );
}

function ClosePeriodForm({ period, onDone }: { period: AccountingPeriod; onDone: () => void }) {
  const { close } = usePeriodMutations();
  const [reason, setReason] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const forceable = period.blockers.length > 0 && period.blockers.every((b) => b.forceable);
  const reasonOk = !forceable || reason.trim().length >= REASON_MIN;

  async function submit(): Promise<void> {
    setFailure(null);
    setSaving(true);
    try {
      await close.mutateAsync({
        id: period.id,
        force: forceable,
        reason: forceable ? reason.trim() : undefined,
      });
      toast.success(`Período ${formatPeriod(period.period)} cerrado`);
      onDone();
    } catch (e) {
      // `PREVIOUS_PERIOD_OPEN` y `PREVIOUS_PERIOD_BLOCKED` nombran el mes que hay
      // que cerrar primero dentro del `message`: se muestra tal cual, porque
      // reescribirlo acá perdería justo el dato que sirve.
      setFailure(e instanceof Error ? e.message : 'No se pudo cerrar el período');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cerrar {formatPeriod(period.period)}</DialogTitle>
        <DialogDescription>
          Cerrado, el mayor rechaza todo asiento con fecha del mes: los movimientos que lleguen tarde
          exigen reabrirlo con un motivo.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {forceable && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                {period.blockers.map((b) => (
                  <li key={b.code}>{b.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {forceable && (
          <Field>
            <FieldLabel htmlFor="close-reason">Motivo</FieldLabel>
            <Textarea
              id="close-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder={`Mínimo ${REASON_MIN} caracteres`}
            />
            <FieldDescription>
              Saltarse una validación es una decisión de alguien: el motivo queda en la auditoría.
            </FieldDescription>
          </Field>
        )}

        {failure && (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="button" disabled={!reasonOk || saving} onClick={() => void submit()}>
          <LockIcon className="size-4" />
          {forceable ? 'Cerrar de todos modos' : 'Cerrar período'}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Reapertura, con el motivo obligatorio.
 *
 * El 409 `PERIOD_HAS_FILED_DECLARATION` no es un error a corregir: es una
 * advertencia que hay que leer antes de decidir —reabrir el mes deja la
 * declaración presentada desactualizada—. Por eso el diálogo no se cierra: pasa
 * a ofrecer el mismo botón con `force`, con el aviso del backend a la vista.
 */
function ReopenPeriodForm({ period, onDone }: { period: AccountingPeriod; onDone: () => void }) {
  const { reopen } = usePeriodMutations();
  const [reason, setReason] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reasonOk = reason.trim().length >= REASON_MIN;

  async function submit(force: boolean): Promise<void> {
    setFailure(null);
    setSaving(true);
    try {
      await reopen.mutateAsync({ id: period.id, reason: reason.trim(), force });
      toast.success(`Período ${formatPeriod(period.period)} reabierto`);
      onDone();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo reabrir el período';
      if (!force && isFiledDeclarationConflict(e)) setWarning(message);
      else setFailure(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Reabrir {formatPeriod(period.period)}</DialogTitle>
        <DialogDescription>
          Vuelve a aceptar asientos con fecha del mes. El motivo queda en la fila del período y en la
          auditoría.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="reopen-reason">Motivo</FieldLabel>
          <Textarea
            id="reopen-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder={`Mínimo ${REASON_MIN} caracteres`}
          />
          <FieldDescription>
            Qué llegó tarde y por qué. Dentro de un año, &quot;ok&quot; no explica nada.
          </FieldDescription>
        </Field>

        {warning && (
          <Alert variant="destructive">
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        )}

        {failure && (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant={warning ? 'destructive' : 'default'}
          disabled={!reasonOk || saving}
          onClick={() => void submit(!!warning)}
        >
          <LockOpenIcon className="size-4" />
          {warning ? 'Reabrir de todos modos' : 'Reabrir período'}
        </Button>
      </DialogFooter>
    </>
  );
}

function isFiledDeclarationConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'PERIOD_HAS_FILED_DECLARATION'
  );
}
