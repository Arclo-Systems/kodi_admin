'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { BanIcon, CircleCheckIcon, ClockIcon, RefreshCwIcon, Undo2Icon, type LucideIcon } from 'lucide-react';
import {
  useCouponRedemptions,
  useUserCouponActions,
  type UserCouponQuery,
  type UserCouponRow,
  type UserCouponStatus,
} from '@/hooks/use-coupons';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = '__all__';

const STATUS_CFG: Record<UserCouponStatus, { tone: StatusTone; icon: LucideIcon; label: string }> = {
  active: { tone: 'info', icon: ClockIcon, label: 'Activo' },
  used: { tone: 'success', icon: CircleCheckIcon, label: 'Usado' },
  invalidated: { tone: 'destructive', icon: BanIcon, label: 'Invalidado' },
};

function rowStatus(r: UserCouponRow): UserCouponStatus {
  if (r.invalidatedAt) return 'invalidated';
  if (r.usedAt) return 'used';
  return 'active';
}

function fmtDateTime(d: string | null): string {
  return d
    ? new Date(d).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
}

type DialogState = { kind: 'regenerate' | 'refund'; row: UserCouponRow };

export function CouponRedemptions({ couponId, role }: { couponId: string; role: AdminRole }) {
  const [query, setQuery] = useState<UserCouponQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useCouponRedemptions(couponId, query);
  const actions = useUserCouponActions(couponId);
  const canSupport = can(role, 'economy:coupon:support');
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const columns = useMemo<ColumnDef<UserCouponRow, unknown>[]>(() => {
    const base: ColumnDef<UserCouponRow, unknown>[] = [
      {
        accessorKey: 'code',
        header: 'Código',
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
      },
      {
        id: 'user',
        header: 'Usuario',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.userDisplayName}</span>
            <span className="text-muted-foreground text-xs">{row.original.userEmail}</span>
          </div>
        ),
      },
      { id: 'redeemedAt', header: 'Canjeado', cell: ({ row }) => fmtDateTime(row.original.redeemedAt) },
      {
        accessorKey: 'kolonesSpent',
        header: 'Kolones',
        cell: ({ row }) => row.original.kolonesSpent.toLocaleString('es-CR'),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const cfg = STATUS_CFG[rowStatus(row.original)];
          return <StatusBadge tone={cfg.tone} icon={cfg.icon} label={cfg.label} />;
        },
      },
    ];

    if (!canSupport) return base;

    return [
      ...base,
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const r = row.original;
          if (r.invalidatedAt) {
            return <span className="text-muted-foreground text-xs">Invalidado</span>;
          }
          return (
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDialog({ kind: 'regenerate', row: r })}
              >
                <RefreshCwIcon className="size-3.5" />
                Regenerar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setDialog({ kind: 'refund', row: r })}
              >
                <Undo2Icon className="size-3.5" />
                Reembolsar
              </Button>
            </div>
          );
        },
      },
    ];
  }, [canSupport]);

  async function onConfirm({ reason }: { reason?: string }): Promise<void> {
    if (!dialog) return;
    if (dialog.kind === 'regenerate') {
      const code = await actions.regenerate.mutateAsync(dialog.row.id);
      toast.success(`Nuevo código: ${code}`);
    } else {
      await actions.refundInvalidate.mutateAsync({
        userCouponId: dialog.row.id,
        reason: reason ?? '',
      });
      toast.success('Kolones reembolsados y cupón invalidado');
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Canjes</h2>

      <DataTable
        toolbar={
          <Select
            value={query.status ?? ALL}
            onValueChange={(v) =>
              setQuery({ ...query, page: 1, status: v === ALL ? undefined : (v as UserCouponStatus) })
            }
          >
            <SelectTrigger className="w-44" size="sm" aria-label="Filtrar por estado del canje">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="used">Usados</SelectItem>
              <SelectItem value="invalidated">Invalidados</SelectItem>
            </SelectContent>
          </Select>
        }
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={query.page}
        pageSize={query.pageSize}
        loading={isLoading}
        onPageChange={(page) => setQuery({ ...query, page })}
        onPageSizeChange={(pageSize) => setQuery({ ...query, page: 1, pageSize })}
        emptyMessage="Este cupón no tiene canjes todavía"
      />

      {dialog && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          title={dialog.kind === 'regenerate' ? 'Regenerar código' : 'Reembolsar e invalidar'}
          description={
            dialog.kind === 'regenerate'
              ? `Se generará un código nuevo para ${dialog.row.userDisplayName}. El anterior dejará de servir.`
              : `Se devolverán ${dialog.row.kolonesSpent.toLocaleString('es-CR')} Kolones a ${dialog.row.userDisplayName} y el cupón quedará invalidado.`
          }
          destructive={dialog.kind === 'refund'}
          requireReason={dialog.kind === 'refund'}
          reasonMinLength={3}
          confirmLabel={dialog.kind === 'regenerate' ? 'Regenerar' : 'Reembolsar'}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
}
