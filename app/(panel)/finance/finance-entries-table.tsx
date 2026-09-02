'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  EyeIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  useFinanceEntries,
  useFinanceEntryMutations,
  FINANCE_CURRENCIES,
  KIND_LABELS,
  type FinanceEntry,
  type FinanceEntryListQuery,
  type FinanceKind,
} from '@/hooks/use-finance';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { openSignedAsset } from '@/lib/signed-asset';
import { StatusBadge } from '@/lib/status-badge';
import { FinanceEntryDialog } from './finance-entry-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = '__all__';
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');
const fmtAmount = (e: FinanceEntry) =>
  `${e.amount.toLocaleString('es-CR', { minimumFractionDigits: 2 })} ${e.currency}`;

function viewReceipt(id: string): void {
  openSignedAsset(`/api/admin/finance/entries/${id}/receipt-url`).catch((e) =>
    toast.error(e instanceof Error ? e.message : 'No se pudo abrir el comprobante'),
  );
}

export function FinanceEntriesTable() {
  const [query, setQuery] = useState<FinanceEntryListQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useFinanceEntries(query);
  const { remove } = useFinanceEntryMutations();
  const [toDelete, setToDelete] = useState<FinanceEntry | null>(null);
  const [detail, setDetail] = useState<FinanceEntry | null>(null);
  const set = (patch: Partial<FinanceEntryListQuery>) => setQuery({ ...query, page: 1, ...patch });

  const columns = useMemo<ColumnDef<FinanceEntry, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Fecha',
        meta: { label: 'Fecha' },
        enableSorting: false,
        cell: ({ row }) => fmtDate(row.original.date),
      },
      {
        accessorKey: 'kind',
        header: 'Tipo',
        meta: { label: 'Tipo' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.kind === 'income' ? (
            <StatusBadge tone="success" icon={TrendingUpIcon} label={KIND_LABELS.income} />
          ) : (
            <StatusBadge tone="warning" icon={TrendingDownIcon} label={KIND_LABELS.expense} />
          ),
      },
      {
        accessorKey: 'categoryName',
        header: 'Categoría',
        meta: { label: 'Categoría' },
        enableSorting: false,
      },
      {
        accessorKey: 'vendor',
        header: 'Proveedor / fuente',
        meta: { label: 'Proveedor / fuente' },
        enableSorting: false,
        cell: ({ row }) => row.original.vendor ?? <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'amount',
        header: 'Monto',
        meta: { label: 'Monto' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{fmtAmount(row.original)}</span>
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
                Editar
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setToDelete(row.original);
              }}
            >
              <Trash2Icon className="size-4" />
              Borrar
            </Button>
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
              <SelectTrigger className="w-36" size="sm" aria-label="Filtrar por tipo">
                <SelectValue placeholder="Tipo" />
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
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Borrar movimiento"
        description="Se elimina el movimiento y su comprobante. No se puede deshacer."
        destructive
        confirmLabel="Borrar"
        onConfirm={async () => {
          if (toDelete) await remove.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
}
