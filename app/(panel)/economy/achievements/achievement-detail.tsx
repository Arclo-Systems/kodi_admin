'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  AwardIcon,
  CircleCheckIcon,
  CircleOffIcon,
  CoinsIcon,
  GiftIcon,
  PencilIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAchievement, useRegrant } from '@/hooks/use-achievements';
import { describeCondition } from './condition-builder';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { unwrapData } from '@/lib/bff';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { KpiCard } from '@/components/admin/kpi-card';
import { StatusBadge } from '@/lib/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const TIER_LABEL: Record<string, string> = {
  common: 'Común',
  uncommon: 'Poco común',
  rare: 'Raro',
  epic: 'Épico',
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-semibold break-all">{children}</span>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/economy/achievements"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeftIcon className="size-3" />
      Logros
    </Link>
  );
}

export function AchievementDetail({ id, role }: { id: string; role: AdminRole }) {
  const { data: a, isLoading } = useAchievement(id);
  const canWrite = can(role, 'economy:achievement:write');
  const canRegrant = can(role, 'economy:achievement:regrant');
  const { preview, run } = useRegrant(id, canRegrant);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!isLoading && !a) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">No se encontró el logro.</p>
      </div>
    );
  }

  const p = preview.data;
  const canRun = !!p && p.affectedUsers > 0 && p.kokosPerUser > 0;

  async function runRegrant(): Promise<void> {
    const body = await run.mutateAsync();
    const r = unwrapData<{ granted: number; totalKokos: number }>(body);
    toast.success(
      `Re-otorgado a ${r?.granted ?? 0} usuario(s) (${(r?.totalKokos ?? 0).toLocaleString('es-CR')} Kokos)`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <BackLink />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{a?.name ?? <Skeleton className="h-7 w-48" />}</h1>
            {a &&
              (a.isActive ? (
                <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
              ) : (
                <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactivo" />
              ))}
          </div>
          {a && <p className="text-muted-foreground font-mono text-sm">{a.code}</p>}
        </div>
        {canWrite && a && (
          <Button asChild size="sm">
            <Link href={`/economy/achievements/${id}/edit`}>
              <PencilIcon className="size-4" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AwardIcon className="text-primary size-4" />
            Detalle
          </CardTitle>
        </CardHeader>
        <CardContent>
          {a ? (
            <dl className="[&>div:last-child]:border-b-0">
              <DetailRow label="Descripción">{a.description}</DetailRow>
              <DetailRow label="Rareza">{TIER_LABEL[a.tier] ?? a.tier}</DetailRow>
              <DetailRow label="Recompensa">{a.kokosReward.toLocaleString('es-CR')} Kokos</DetailRow>
              <DetailRow label="Condición">{describeCondition(a.condition)}</DetailRow>
              <DetailRow label="Una sola vez">{a.isOneTime ? 'Sí' : 'No'}</DetailRow>
              <DetailRow label="Desbloqueado por">{a.unlockedBy} usuario(s)</DetailRow>
            </dl>
          ) : (
            <div className="space-y-2 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canRegrant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GiftIcon className="text-primary size-4" />
              Re-otorgar Kokos
            </CardTitle>
            <CardDescription>
              Paga la recompensa actual a cada usuario que ya tiene el logro (vía ledger, ajuste
              manual). No re-evalúa la condición.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                label="Usuarios con el logro"
                value={p?.affectedUsers ?? 0}
                icon={<UsersIcon />}
                tone="blue"
                loading={preview.isLoading}
              />
              <KpiCard
                label="Kokos por usuario"
                value={p?.kokosPerUser ?? 0}
                icon={<CoinsIcon />}
                tone="amber"
                loading={preview.isLoading}
              />
              <KpiCard
                label="Costo total"
                value={(p?.totalKokos ?? 0).toLocaleString('es-CR')}
                icon={<WalletIcon />}
                tone="teal"
                loading={preview.isLoading}
              />
            </div>
            {!!p && p.affectedUsers === 0 && (
              <p className="text-muted-foreground text-sm">Nadie tiene este logro todavía.</p>
            )}
            {!!p && p.kokosPerUser === 0 && (
              <p className="text-muted-foreground text-sm">El logro no otorga Kokos.</p>
            )}
            <div className="flex justify-end">
              <Button disabled={!canRun || run.isPending} onClick={() => setConfirmOpen(true)}>
                <CoinsIcon className="size-4" />
                Re-otorgar Kokos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Re-otorgar Kokos"
        description={
          p
            ? `Se acreditarán ${p.kokosPerUser.toLocaleString('es-CR')} Kokos a ${p.affectedUsers} usuario(s) (${p.totalKokos.toLocaleString('es-CR')} en total). No se puede deshacer.`
            : undefined
        }
        destructive
        confirmLabel="Re-otorgar"
        onConfirm={runRegrant}
      />
    </div>
  );
}
