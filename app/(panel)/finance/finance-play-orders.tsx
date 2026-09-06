'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleAlertIcon, RotateCcwIcon, StoreIcon } from 'lucide-react';
import {
  PLAY_ORDER_ATTENTION_STATUSES,
  PLAY_ORDER_STATUSES,
  usePlayOrderCounts,
  usePlayOrders,
  useRetryPlayOrder,
  type PlayOrder,
  type PlayOrderListQuery,
  type PlayOrderStatus,
} from '@/hooks/use-finance';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { civilDayEndIso, civilDayStartIso } from '@/lib/civil-date';
import { cn } from '@/lib/utils';
import {
  PLAY_ORDER_STATUS_BADGE,
  PLAY_ORDER_STATUS_HINTS,
  PLAY_ORDER_STATUS_LABELS,
  STATUS_TONE_TEXT,
  formatAmount,
} from './finance-format';
import { FinancePlayOrderDialog } from './finance-play-order-dialog';
import { PlayOrderStatusBadge, playOrderGrossExTax } from './finance-play-order-badges';

const ALL = '__all__';
const PAGE_SIZE = 20;

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');

// Reintentar solo tiene sentido donde falta el asiento y la causa se arregla
// afuera: el plan de cuentas, el período, el enum de monedas. En `POSTED`,
// `PENDING`, `REVERSED` y `SKIPPED` el job volvería a no hacer nada.
const RETRYABLE = new Set<PlayOrderStatus>(PLAY_ORDER_ATTENTION_STATUSES);

const Vacio = () => <span className="text-muted-foreground">—</span>;

function Money({ amount, currency }: { amount: string | null; currency: string }) {
  if (amount === null) return <Vacio />;
  // La moneda es la CRUDA de Google (la del comprador): se pega al monto en vez
  // de asumir la del panel, porque una orden en BRL no es una orden en colones.
  return <span className="tabular-nums">{formatAmount(amount, currency)}</span>;
}

export function FinancePlayOrders({ canWrite = false }: { canWrite?: boolean }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<PlayOrderStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [detail, setDetail] = useState<PlayOrder | null>(null);
  const [toRetry, setToRetry] = useState<PlayOrder | null>(null);

  const range = {
    from: from ? civilDayStartIso(from) : undefined,
    to: to ? civilDayEndIso(to) : undefined,
  };
  const query: PlayOrderListQuery = { ...range, postingStatus: status, page, pageSize };
  const { data, isLoading, isError, error, refetch } = usePlayOrders(query);
  const {
    counts,
    isLoading: countsLoading,
    isError: countsError,
    refetch: refetchCounts,
  } = usePlayOrderCounts(range);
  const retry = useRetryPlayOrder();

  const columns = useMemo<ColumnDef<PlayOrder, unknown>[]>(
    () => [
      {
        accessorKey: 'createTime',
        header: 'Fecha',
        meta: { label: 'Fecha' },
        enableSorting: false,
        cell: ({ row }) => fmtDate(row.original.createTime),
      },
      {
        accessorKey: 'orderId',
        header: 'Orden',
        meta: { label: 'Orden' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs break-all">{row.original.orderId}</span>
        ),
      },
      {
        accessorKey: 'postingStatus',
        header: 'Asiento',
        meta: { label: 'Asiento' },
        enableSorting: false,
        cell: ({ row }) => <PlayOrderStatusBadge status={row.original.postingStatus} />,
      },
      {
        id: 'gross',
        header: 'Bruto sin impuesto',
        meta: { label: 'Bruto sin impuesto' },
        enableSorting: false,
        cell: ({ row }) => (
          <Money
            amount={playOrderGrossExTax(row.original)}
            currency={row.original.totalCurrency}
          />
        ),
      },
      {
        accessorKey: 'commission',
        header: 'Comisión Google',
        meta: { label: 'Comisión Google' },
        enableSorting: false,
        cell: ({ row }) => (
          <Money amount={row.original.commission} currency={row.original.totalCurrency} />
        ),
      },
      {
        accessorKey: 'developerRevenue',
        header: 'Neto',
        meta: { label: 'Neto' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">
            <Money
              amount={row.original.developerRevenue}
              currency={row.original.developerRevenueCurrency}
            />
          </span>
        ),
      },
      {
        accessorKey: 'journalEntryNumber',
        header: 'Asiento nº',
        meta: { label: 'Asiento nº' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.journalEntryNumber ? (
            <span className="tabular-nums">{row.original.journalEntryNumber}</span>
          ) : (
            <Vacio />
          ),
      },
      {
        id: 'acciones',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) =>
          canWrite && RETRYABLE.has(row.original.postingStatus) ? (
            <div className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setToRetry(row.original);
                }}
              >
                <RotateCcwIcon className="size-4" />
                Reintentar
              </Button>
            </div>
          ) : null,
      },
    ],
    [canWrite],
  );

  return (
    <div className="space-y-4">
      <PlayOrderSummary
        counts={counts}
        loading={countsLoading}
        failed={countsError}
        onRetry={() => void refetchCounts()}
        selected={status}
        onSelect={(next) => {
          setStatus(next);
          setPage(1);
        }}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error
                ? error.message
                : 'No se pudieron cargar las órdenes de Google Play.'}
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
              value={status ?? ALL}
              onValueChange={(v) => {
                setStatus(v === ALL ? undefined : (v as PlayOrderStatus));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48" size="sm" aria-label="Filtrar por estado">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {PLAY_ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PLAY_ORDER_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker
              from={from}
              to={to}
              onChange={(f, t) => {
                setFrom(f);
                setTo(t);
                setPage(1);
              }}
              placeholder="Todas las fechas"
              aria-label="Rango de fechas"
              className="w-auto"
            />
            <span className="text-muted-foreground text-sm">Por fecha de cobro en Google.</span>
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
        onRowClick={setDetail}
        emptyIcon={<StoreIcon />}
        // Con la lista caída la tabla también queda sin filas: decir "todavía no
        // hay órdenes" ahí sería afirmar que no entró plata, que es lo contrario
        // de lo que se sabe.
        emptyMessage={isError ? 'No se pudo cargar' : 'Todavía no hay órdenes de Google Play registradas'}
        emptyDescription={
          isError
            ? 'Reintentá la carga para ver las órdenes.'
            : 'Aparecen automáticamente con cada cobro de suscripción.'
        }
      />

      <FinancePlayOrderDialog
        order={detail}
        onOpenChange={(open) => !open && setDetail(null)}
        formatDate={fmtDate}
      />

      <ConfirmDialog
        open={!!toRetry}
        onOpenChange={(open) => !open && setToRetry(null)}
        title="Reintentar el asiento"
        description="Vuelve a pedirle la orden a Google y a emitir el asiento. El job es idempotente: si ya estaba asentada, no duplica nada."
        confirmLabel="Reintentar"
        onConfirm={async () => {
          if (!toRetry) return;
          // El error del backend (orden no ingestada, formato inválido) se
          // muestra dentro del propio ConfirmDialog, que es donde está mirando
          // quien confirmó.
          await retry.mutateAsync(toRetry.orderId);
          toast.success('Reintento encolado');
          setToRetry(null);
        }}
      />
    </div>
  );
}

/**
 * Conteo por estado del rango que se está mirando, y filtro de un clic.
 *
 * Los tres estados que necesitan atención van primero y con el tono de su badge:
 * son ingresos cobrados que todavía no están en el libro, y en una lista
 * paginada se pierden entre las órdenes asentadas.
 */
function PlayOrderSummary({
  counts,
  loading,
  failed,
  onRetry,
  selected,
  onSelect,
}: {
  counts: Record<PlayOrderStatus, number | undefined>;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  selected: PlayOrderStatus | undefined;
  onSelect: (status: PlayOrderStatus | undefined) => void;
}) {
  const ordered: PlayOrderStatus[] = [
    ...PLAY_ORDER_ATTENTION_STATUSES,
    ...PLAY_ORDER_STATUSES.filter((s) => !RETRYABLE.has(s)),
  ];

  return (
    <Card>
      <CardContent className="space-y-2">
        {/* Un conteo que no llegó no es un cero. Sin decirlo, "0 órdenes que
            fallaron" sobre un endpoint caído se lee como una buena noticia. */}
        {failed && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>No se pudo contar las órdenes por estado.</span>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div role="group" aria-label="Órdenes por estado" className="flex flex-wrap items-stretch gap-1">
          {ordered.map((status) => {
            const count = counts[status];
            const attention = RETRYABLE.has(status) && (count ?? 0) > 0;
            const active = selected === status;
            return (
              <Tooltip key={status}>
                <TooltipTrigger asChild>
                  <Button
                    variant={active ? 'secondary' : 'ghost'}
                    className="h-auto flex-col items-start gap-0.5 px-3 py-2"
                    aria-pressed={active}
                    onClick={() => onSelect(active ? undefined : status)}
                  >
                    {loading ? (
                      <Skeleton className="h-6 w-8" />
                    ) : failed ? (
                      // "—" a secas se lee como "ninguna": el icono dice que el
                      // número falta, no que sea cero.
                      <span className="text-destructive flex h-7 items-center">
                        <CircleAlertIcon className="size-5" aria-label="sin dato" />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'text-xl font-semibold tabular-nums',
                          // El tono del propio estado: una moneda sin soporte es
                          // una advertencia, no un fallo.
                          attention && STATUS_TONE_TEXT[PLAY_ORDER_STATUS_BADGE[status].tone],
                        )}
                      >
                        {count ?? '—'}
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs font-normal">
                      {PLAY_ORDER_STATUS_LABELS[status]}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{PLAY_ORDER_STATUS_HINTS[status]}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
