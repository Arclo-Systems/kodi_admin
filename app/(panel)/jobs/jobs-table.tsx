'use client';

import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  HourglassIcon,
  LoaderIcon,
  type LucideIcon,
  RotateCcwIcon,
  Trash2Icon,
  XCircleIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/data-table';
import { KpiCard, type KpiTone } from '@/components/admin/kpi-card';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import {
  JOB_STATES,
  JOBS_PAGE_SIZE,
  useJobCounts,
  useJobs,
  useJobMutations,
  type Job,
  type JobState,
} from '@/hooks/use-jobs';

const STATE_LABELS: Record<string, string> = {
  waiting: 'En espera',
  active: 'Activos',
  completed: 'Completados',
  failed: 'Fallidos',
  delayed: 'Demorados',
};
// Faro de estado del job (icono + tono), espejo de los iconos de las KPI cards.
const STATE_FARO: Record<string, { icon: LucideIcon; tone: StatusTone }> = {
  waiting: { icon: HourglassIcon, tone: 'muted' },
  active: { icon: LoaderIcon, tone: 'info' },
  completed: { icon: CheckCircle2Icon, tone: 'success' },
  failed: { icon: XCircleIcon, tone: 'destructive' },
  delayed: { icon: ClockIcon, tone: 'warning' },
};

function JobStateBadge({ state }: { state: string }) {
  const f = STATE_FARO[state] ?? { icon: HourglassIcon, tone: 'muted' as const };
  return <StatusBadge tone={f.tone} icon={f.icon} label={STATE_LABELS[state] ?? state} />;
}

const STATE_ICON: Record<string, ReactNode> = {
  waiting: <HourglassIcon />,
  active: <LoaderIcon />,
  completed: <CheckCircle2Icon />,
  failed: <XCircleIcon />,
  delayed: <ClockIcon />,
};
const STATE_TONE: Record<string, KpiTone> = {
  waiting: 'neutral',
  active: 'teal',
  completed: 'green',
  failed: 'red',
  delayed: 'amber',
};
const fmtCount = (n: number | undefined) => (n ?? 0).toLocaleString('es-CR');
const fmtTime = (ms: number | null) => (ms ? new Date(ms).toLocaleString('es-CR') : '—');

export function JobsTable() {
  const [state, setState] = useState<JobState>('failed');
  const [page, setPage] = useState(1);

  const counts = useJobCounts();
  const { data, isLoading, isError } = useJobs(state, page);
  const { retry, remove, retryAllFailed } = useJobMutations();

  const [detail, setDetail] = useState<Job | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Job | null>(null);
  const [retryAllOpen, setRetryAllOpen] = useState(false);

  const items = data?.items ?? [];
  const failedCount = counts.data?.failed ?? 0;

  async function onRetry(id: string): Promise<void> {
    try {
      await retry.mutateAsync(id);
      toast.success('Job reencolado');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const columns: ColumnDef<Job, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Job',
      meta: { label: 'Job' },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-muted-foreground text-xs">#{row.original.id}</div>
        </div>
      ),
    },
    {
      accessorKey: 'state',
      header: 'Estado',
      meta: { label: 'Estado' },
      cell: ({ row }) => <JobStateBadge state={row.original.state} />,
    },
    { accessorKey: 'attemptsMade', header: 'Intentos', meta: { label: 'Intentos' } },
    {
      id: 'processed',
      header: 'Procesado',
      meta: { label: 'Procesado' },
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {fmtTime(row.original.finishedOn ?? row.original.processedOn)}
        </span>
      ),
    },
    {
      accessorKey: 'failedReason',
      header: 'Razón',
      meta: { label: 'Razón' },
      cell: ({ row }) => (
        <span className="text-muted-foreground block max-w-xs truncate text-xs">
          {row.original.failedReason ?? '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const j = row.original;
        return (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setDetail(j)}>
              <EyeIcon className="size-4" /> Detalle
            </Button>
            {j.state === 'failed' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary"
                disabled={retry.isPending}
                onClick={() => onRetry(j.id)}
              >
                <RotateCcwIcon className="size-4" /> Reintentar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setRemoveTarget(j)}
            >
              <Trash2Icon className="size-4" /> Eliminar
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {JOB_STATES.map((s) => (
          <KpiCard
            key={s}
            label={STATE_LABELS[s] ?? s}
            value={fmtCount(counts.data?.[s])}
            loading={counts.isLoading}
            tone={STATE_TONE[s]}
            icon={STATE_ICON[s]}
          />
        ))}
      </div>

      <DataTable
        toolbar={
          <>
            <Select
              value={state}
              onValueChange={(v) => {
                setState(v as JobState);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state === 'failed' && failedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => setRetryAllOpen(true)}
              >
                <RotateCcwIcon className="size-4" /> Reintentar todos ({fmtCount(failedCount)})
              </Button>
            )}
          </>
        }
        columns={columns}
        data={items}
        total={counts.data?.[state] ?? items.length}
        page={page}
        pageSize={JOBS_PAGE_SIZE}
        loading={isLoading}
        onPageChange={setPage}
        emptyMessage={
          isError ? 'No se pudieron cargar los jobs.' : `Sin jobs en «${STATE_LABELS[state]}».`
        }
      />

      <JobDetailDialog job={detail} onClose={() => setDetail(null)} />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Eliminar job"
        description="Quita el job de la cola. No se puede deshacer."
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (removeTarget) await remove.mutateAsync(removeTarget.id);
          toast.success('Job eliminado');
        }}
      />

      <ConfirmDialog
        open={retryAllOpen}
        onOpenChange={setRetryAllOpen}
        title="Reintentar todos los fallidos"
        description="Se reencolarán hasta 100 jobs fallidos."
        confirmLabel="Reintentar todos"
        onConfirm={async () => {
          const res = (await retryAllFailed.mutateAsync()) as { retried?: number };
          toast.success(`${fmtCount(res?.retried)} jobs reencolados`);
        }}
      />
    </div>
  );
}

function JobDetailDialog({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const dataStr = job ? JSON.stringify(job.data, null, 2) : '';
  const hasData = !!dataStr && dataStr !== '{}' && dataStr !== 'null';
  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {job && <JobStateBadge state={job.state} />}
            {job?.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs break-all">#{job?.id}</DialogDescription>
        </DialogHeader>
        {job && (
          <div className="space-y-4 text-sm">
            {job.failedReason && (
              <div>
                <p className="text-muted-foreground mb-1.5 text-xs font-medium">Razón del fallo</p>
                <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 font-mono text-xs break-words">
                  {job.failedReason}
                </div>
              </div>
            )}
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">Data</p>
              {hasData ? (
                <pre className="bg-muted max-h-64 overflow-auto rounded-lg p-3 text-xs">
                  {dataStr}
                </pre>
              ) : (
                <p className="text-muted-foreground text-xs">Sin data adicional.</p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 text-xs">
              <DetailMeta label="Creado">{fmtTime(job.timestamp)}</DetailMeta>
              <DetailMeta label="Procesado">{fmtTime(job.processedOn)}</DetailMeta>
              <DetailMeta label="Finalizado">{fmtTime(job.finishedOn)}</DetailMeta>
              <DetailMeta label="Intentos">{job.attemptsMade}</DetailMeta>
            </dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailMeta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{children}</dd>
    </div>
  );
}
