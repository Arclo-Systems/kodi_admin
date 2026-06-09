'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type RowData,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  InboxIcon,
  Settings2Icon,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTablePagination } from './data-table-pagination';

// Etiqueta legible por columna para el menú "Columnas" (en vez del id crudo).
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
  }
}

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  // Controles de filtro a la izquierda de la barra; comparten fila con "Columnas".
  toolbar?: ReactNode;
  // Id de un contenedor externo donde portar la barra (toolbar + "Columnas"). Útil para
  // compartir la fila de una TabsList: la barra queda en la misma línea que los tabs.
  toolbarPortalId?: string;
  // Selección múltiple opt-in (L3). Default off → no afecta los usos existentes.
  enableSelection?: boolean;
  getRowId?: (row: TData) => string;
  onSelectionChange?: (rows: TData[]) => void;
};

export function DataTable<TData>(props: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!props.enableSelection) return props.columns;
    const selectionColumn: ColumnDef<TData, unknown> = {
      id: 'select',
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Seleccionar toda la página"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Seleccionar fila"
        />
      ),
    };
    return [selectionColumn, ...props.columns];
  }, [props.enableSelection, props.columns]);

  const table = useReactTable({
    data: props.data,
    columns,
    state: { sorting, columnVisibility, rowSelection },
    enableRowSelection: props.enableSelection,
    onRowSelectionChange: setRowSelection,
    getRowId: props.getRowId,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      setSorting(updater);
      if (props.onSortingChange) {
        props.onSortingChange(typeof updater === 'function' ? updater(sorting) : updater);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  // AUD-L3-API-1: emite la selección hacia afuera; el padre NO la realimenta → sin loop.
  useEffect(() => {
    props.onSelectionChange?.(table.getSelectedRowModel().rows.map((r) => r.original));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  const hideableColumns = table.getAllColumns().filter((c) => c.getCanHide());

  // Nodo destino del portal (resuelto tras montar; el contenedor lo renderiza el padre).
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (props.toolbarPortalId) setPortalNode(document.getElementById(props.toolbarPortalId));
  }, [props.toolbarPortalId]);

  const columnsMenu =
    hideableColumns.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2Icon className="size-3" />
            Columnas
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
          {hideableColumns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.columnDef.meta?.label ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  const hasControls = props.toolbar != null || columnsMenu != null;

  return (
    <div className="space-y-3">
      {!props.toolbarPortalId && hasControls && (
        <div className="flex flex-wrap items-center gap-2">
          {props.toolbar}
          {columnsMenu}
        </div>
      )}
      {props.toolbarPortalId && portalNode && hasControls
        ? createPortal(
            <div className="flex flex-wrap items-center gap-2">
              {props.toolbar}
              {columnsMenu}
            </div>,
            portalNode,
          )
        : null}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  const header = h.column.columnDef.header;
                  return (
                    <TableHead
                      key={h.id}
                      scope="col"
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : canSort
                              ? 'none'
                              : undefined
                      }
                    >
                      {canSort && typeof header === 'string' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8"
                          onClick={h.column.getToggleSortingHandler()}
                          aria-label={`Ordenar por ${header}`}
                        >
                          {header}
                          {sorted === 'asc' ? (
                            <ArrowUpIcon className="ml-1.5 size-3.5" />
                          ) : sorted === 'desc' ? (
                            <ArrowDownIcon className="ml-1.5 size-3.5" />
                          ) : (
                            <ChevronsUpDownIcon className="ml-1.5 size-3.5 opacity-50" />
                          )}
                        </Button>
                      ) : (
                        flexRender(header, h.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {props.loading ? (
              Array.from({ length: props.pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_c, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-14">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div
                      aria-hidden
                      className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full [&_svg]:size-6"
                    >
                      {props.emptyIcon ?? <InboxIcon />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {props.emptyMessage ?? 'No hay resultados'}
                      </p>
                      {props.emptyDescription && (
                        <p className="text-muted-foreground max-w-sm text-sm">
                          {props.emptyDescription}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={props.onRowClick ? () => props.onRowClick?.(row.original) : undefined}
                  className={props.onRowClick ? 'hover:bg-muted/50 cursor-pointer' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        page={props.page}
        pageSize={props.pageSize}
        total={props.total}
        onPageChange={props.onPageChange}
        onPageSizeChange={props.onPageSizeChange}
      />
    </div>
  );
}
