'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/data-table';
import {
  TICKET_STATUS_META,
  TICKET_TYPE_META,
  TicketStatusBadge,
  TicketTypeBadge,
} from '@/lib/ticket-meta';
import { TICKETS_PAGE_SIZE, useTickets, type Ticket } from '@/hooks/use-tickets';

const ALL = 'all';
const TYPES = ['question_report', 'suggestion', 'bug_report'] as const;
const STATUSES = ['open', 'triaging', 'resolved', 'dismissed'] as const;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');

const columns: ColumnDef<Ticket, unknown>[] = [
  {
    accessorKey: 'type',
    header: 'Tipo',
    meta: { label: 'Tipo' },
    cell: ({ row }) => <TicketTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: 'message',
    header: 'Mensaje',
    meta: { label: 'Mensaje' },
    cell: ({ row }) => <span className="block max-w-xs truncate">{row.original.message}</span>,
  },
  {
    id: 'user',
    header: 'Usuario',
    meta: { label: 'Usuario' },
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.user?.displayName ?? '—'}</div>
        <div className="text-muted-foreground text-xs">{row.original.user?.country}</div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    meta: { label: 'Estado' },
    cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Fecha',
    meta: { label: 'Fecha' },
    cell: ({ row }) => fmtDate(row.original.createdAt),
  },
];

export function TicketsTable() {
  const router = useRouter();
  const [status, setStatus] = useState('open');
  const [type, setType] = useState(ALL);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useTickets({
    page,
    pageSize: TICKETS_PAGE_SIZE,
    status: status === ALL ? undefined : status,
    type: type === ALL ? undefined : type,
  });

  const reset = () => setPage(1);

  return (
    <DataTable
      toolbar={
        <>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              reset();
            }}
          >
            <SelectTrigger className="w-44" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TICKET_STATUS_META[s]?.label ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v);
              reset();
            }}
          >
            <SelectTrigger className="w-44" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TICKET_TYPE_META[t]?.label ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
      columns={columns}
      data={data?.items ?? []}
      total={data?.total ?? 0}
      page={page}
      pageSize={TICKETS_PAGE_SIZE}
      loading={isLoading}
      onPageChange={setPage}
      onRowClick={(t) => router.push(`/tickets/${t.id}`)}
      emptyMessage={isError ? 'No se pudieron cargar los tickets.' : 'Sin tickets en este filtro.'}
    />
  );
}
