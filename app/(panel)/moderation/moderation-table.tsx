'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { InboxIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/data-table';
import { KpiCard } from '@/components/admin/kpi-card';
import { SEVERITY_META, SeverityBadge } from '@/lib/severity';
import { ReportStatusBadge } from '@/lib/report-status';
import {
  MODERATION_PAGE_SIZE,
  useModerationStats,
  useReports,
  type Report,
} from '@/hooks/use-moderation';

const ALL = 'all';
const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_review: 'En revisión',
  dismissed: 'Desestimado',
  actioned: 'Accionado',
  escalated: 'Escalado',
};
const REASON_LABELS: Record<string, string> = {
  offensive_name: 'Nombre ofensivo',
  inappropriate_avatar: 'Avatar inapropiado',
  impersonation: 'Suplantación',
  cheating_speed: 'Trampa (velocidad)',
  cheating_pattern: 'Trampa (patrón)',
  abandonment: 'Abandono',
  other: 'Otro',
};
const STATUSES = ['open', 'in_review', 'dismissed', 'actioned', 'escalated'] as const;
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');

const columns: ColumnDef<Report, unknown>[] = [
  {
    accessorKey: 'severity',
    header: 'Severidad',
    meta: { label: 'Severidad' },
    cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
  },
  {
    accessorKey: 'reason',
    header: 'Motivo',
    meta: { label: 'Motivo' },
    cell: ({ row }) => REASON_LABELS[row.original.reason] ?? row.original.reason,
  },
  {
    id: 'reportedUser',
    header: 'Denunciado',
    meta: { label: 'Denunciado' },
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.reportedUser?.displayName ?? '—'}</div>
        <div className="text-muted-foreground text-xs">{row.original.reportedUser?.country}</div>
      </div>
    ),
  },
  {
    accessorKey: 'source',
    header: 'Origen',
    meta: { label: 'Origen' },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.source === 'detector' ? 'Detector' : 'Usuario'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    meta: { label: 'Estado' },
    cell: ({ row }) => <ReportStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Fecha',
    meta: { label: 'Fecha' },
    cell: ({ row }) => fmtDate(row.original.createdAt),
  },
];

export function ModerationTable() {
  const router = useRouter();
  const [status, setStatus] = useState('open');
  const [severity, setSeverity] = useState(ALL);
  const [page, setPage] = useState(1);

  const stats = useModerationStats();
  const { data, isLoading, isError } = useReports({
    page,
    pageSize: MODERATION_PAGE_SIZE,
    status: status === ALL ? undefined : status,
    severity: severity === ALL ? undefined : severity,
  });

  const reset = () => setPage(1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        <KpiCard
          label="Abiertos / en revisión"
          value={(stats.data?.open ?? 0).toLocaleString('es-CR')}
          loading={stats.isLoading}
          tone="teal"
          icon={<InboxIcon />}
        />
        {SEVERITIES.map((s) => {
          const meta = SEVERITY_META[s];
          const Icon = meta.Icon;
          return (
            <KpiCard
              key={s}
              label={meta.label}
              value={(stats.data?.bySeverity[s] ?? 0).toLocaleString('es-CR')}
              loading={stats.isLoading}
              icon={<Icon />}
              iconClassName={meta.chip}
            />
          );
        })}
      </div>

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
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={severity}
              onValueChange={(v) => {
                setSeverity(v);
                reset();
              }}
            >
              <SelectTrigger className="w-40" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toda severidad</SelectItem>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SEVERITY_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <Link href="/moderation/prohibited-words">Palabras prohibidas</Link>
            </Button>
          </>
        }
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={MODERATION_PAGE_SIZE}
        loading={isLoading}
        onPageChange={setPage}
        onRowClick={(r) => router.push(`/moderation/${r.id}`)}
        emptyMessage={isError ? 'No se pudieron cargar los reportes.' : 'Sin reportes en este filtro.'}
      />
    </div>
  );
}
