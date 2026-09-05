'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { BanIcon, EyeIcon, PaperclipIcon, PencilIcon, PlusIcon } from 'lucide-react';
import {
  useFinanceEntries,
  useVoidFinanceEntry,
  FINANCE_CURRENCIES,
  KIND_LABELS,
  type FinanceEntry,
  type FinanceEntryListQuery,
  type FinanceKind,
} from '@/hooks/use-finance';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { openSignedAsset } from '@/lib/signed-asset';
import { cn } from '@/lib/utils';
import { EntryStatusBadge, MovementTypeBadge } from './finance-entry-badges';
import { FinanceEntryDialog } from './finance-entry-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = '__all__';
const VOID_REASON_MIN = 5;

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');
// `amount` viaja como string con dos decimales fijos; se pasa por Number solo para
// darle el separador de miles, nunca para guardarlo ni para reenviarlo.
const fmtAmount = (e: FinanceEntry) =>
  `${Number(e.amount).toLocaleString('es-CR', { minimumFractionDigits: 2 })} ${e.currency}`;

function viewReceipt(id: string): void {
  openSignedAsset(`/api/admin/finance/entries/${id}/receipt-url`).catch((e) =>
    toast.error(e instanceof Error ? e.message : 'No se pudo abrir el comprobante'),
  );
}

// La fila anulada sigue en la lista (es parte del libro) pero deja de competir
// visualmente con las vivas. `DataTable` no expone la fila, así que la atenuación
// va celda por celda.
function Voidable({ entry, children }: { entry: FinanceEntry; children: ReactNode }) {
  return (
    <span className={cn(entry.status === 'VOIDED' && 'text-muted-foreground opacity-70')}>
      {children}
    </span>
  );
}

export function FinanceEntriesTable() {
  const [query, setQuery] = useState<FinanceEntryListQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useFinanceEntries(query);
  const voidEntry = useVoidFinanceEntry();
  const [toVoid, setToVoid] = useState<FinanceEntry | null>(null);
  const [detail, setDetail] = useState<FinanceEntry | null>(null);
  const set = (patch: Partial<FinanceEntryListQuery>) => setQuery({ ...query, page: 1, ...patch });

  const columns = useMemo<ColumnDef<FinanceEntry, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Fecha',
        meta: { label: 'Fecha' },
        enableSorting: false,
        cell: ({ row }) => (
          <Voidable entry={row.original}>{fmtDate(row.original.date)}</Voidable>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Tipo',
        meta: { label: 'Tipo' },
        enableSorting: false,
        cell: ({ row }) => <MovementTypeBadge type={row.original.type} />,
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        meta: { label: 'Estado' },
        enableSorting: false,
        cell: ({ row }) => <EntryStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'categoryName',
        header: 'Categoría',
        meta: { label: 'Categoría' },
        enableSorting: false,
        cell: ({ row }) => (
          <Voidable entry={row.original}>{row.original.categoryName}</Voidable>
        ),
      },
      {
        accessorKey: 'vendor',
        header: 'Proveedor / fuente',
        meta: { label: 'Proveedor / fuente' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.vendor ? (
            <Voidable entry={row.original}>{row.original.vendor}</Voidable>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'amount',
        header: 'Monto',
        meta: { label: 'Monto' },
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className={cn(
              'font-medium tabular-nums',
              row.original.status === 'VOIDED' && 'text-muted-foreground line-through',
            )}
          >
            {fmtAmount(row.original)}
          </span>
        ),
      },
      {
        id: 'receipt',
        header: 'Comprobante',
        meta: { label: 'Comprobante' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.hasReceipt ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                void viewReceipt(row.original.id);
              }}
            >
              <PaperclipIcon className="size-4" />
              Ver
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'actions',
        header: '',
        meta: { label: 'Acciones' },
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {/* La fila abre el detalle con el mouse; este botón es el mismo camino por teclado. */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDetail(row.original);
              }}
            >
              <EyeIcon className="size-4" />
              Ver
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={`/finance/movimientos/${row.original.id}/edit`}
                onClick={(e) => e.stopPropagation()}
              >
                <PencilIcon className="size-4" />
                {row.original.status === 'VOIDED' ? 'Abrir' : 'Editar'}
              </Link>
            </Button>
            {row.original.status !== 'VOIDED' && <VoidButton entry={row.original} onPick={setToVoid} />}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        toolbar={
          <>
            <Select
              value={query.kind ?? ALL}
              onValueChange={(v) => set({ kind: v === ALL ? undefined : (v as FinanceKind) })}
            >
              <SelectTrigger className="w-36" size="sm" aria-label="Filtrar por signo">
                <SelectValue placeholder="Signo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                <SelectItem value="expense">{KIND_LABELS.expense}</SelectItem>
                <SelectItem value="income">{KIND_LABELS.income}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={query.currency ?? ALL}
              onValueChange={(v) => set({ currency: v === ALL ? undefined : v })}
            >
              <SelectTrigger className="w-32" size="sm" aria-label="Filtrar por moneda">
                <SelectValue placeholder="Moneda" />
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
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link href="/finance/movimientos/new">
                  <PlusIcon className="size-4" />
                  Nuevo movimiento
                </Link>
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={query.page}
        pageSize={query.pageSize}
        loading={isLoading}
        onPageChange={(page) => setQuery({ ...query, page })}
        onPageSizeChange={(pageSize) => setQuery({ ...query, page: 1, pageSize })}
        onRowClick={setDetail}
        emptyMessage="Sin movimientos con esos filtros"
      />

      <FinanceEntryDialog
        entry={detail}
        onOpenChange={(open) => !open && setDetail(null)}
        fmtDate={fmtDate}
        fmtAmount={fmtAmount}
      />

      <ConfirmDialog
        open={!!toVoid}
        onOpenChange={(o) => !o && setToVoid(null)}
        title="Anular movimiento"
        description="El movimiento queda anulado y su asiento se revierte con uno nuevo fechado hoy. El motivo queda en el libro."
        destructive
        requireReason
        reasonMinLength={VOID_REASON_MIN}
        confirmLabel="Anular"
        onConfirm={async ({ reason }) => {
          if (!toVoid || !reason) return;
          await voidEntry.mutateAsync({ id: toVoid.id, reason });
          setToVoid(null);
        }}
      />
    </>
  );
}

// Los movimientos históricos todavía no tienen asiento: anularlos dejaría al P&L y
// al mayor contando cosas distintas, así que el backend los rechaza hasta el backfill.
function VoidButton({
  entry,
  onPick,
}: {
  entry: FinanceEntry;
  onPick: (entry: FinanceEntry) => void;
}) {
  const posted = !!entry.journalEntryId;
  const button = (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={!posted}
      onClick={(e) => {
        e.stopPropagation();
        onPick(entry);
      }}
    >
      <BanIcon className="size-4" />
      Anular
    </Button>
  );
  if (posted) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} onClick={(e) => e.stopPropagation()}>
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>Pendiente de contabilizar</TooltipContent>
    </Tooltip>
  );
}
