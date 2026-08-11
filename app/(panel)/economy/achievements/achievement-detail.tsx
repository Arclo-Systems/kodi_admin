'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import {
  useAchievement,
  useRegrant,
  type RegrantResult,
} from '@/hooks/use-achievements';
import { describeCondition } from './condition-builder';
import { rewardLabel } from '@/lib/reward-label';
import { AchievementTierBadge } from '@/lib/achievement-tier';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { unwrapData } from '@/lib/bff';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { KpiCard } from '@/components/admin/kpi-card';
import { StatusBadge } from '@/lib/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
  const perUser = p
    ? {
        xpReward: p.xpPerUser,
        kokosReward: p.kokosPerUser,
        kolonesReward: p.kolonesPerUser,
      }
    : null;
  // Un logro de puro honor (0/0/0) no tiene nada que re-pagar: correrlo solo dejaría
  // una entrada de auditoría sin movimiento.
  const paysSomething = !!perUser && rewardLabel(perUser) !== '—';
  const canRun = !!p && p.affectedUsers > 0 && paysSomething;

  async function runRegrant(): Promise<void> {
    const body = await run.mutateAsync();
    const r = unwrapData<RegrantResult>(body);
    const total = rewardLabel({
      xpReward: r?.totalXp ?? 0,
      kokosReward: r?.totalKokos ?? 0,
      kolonesReward: r?.totalKolones ?? 0,
    });
    toast.success(`Re-otorgado a ${r?.granted ?? 0} usuario(s) (${total})`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* El hueco se reserva mientras carga: si no, el título salta al llegar el ícono. */}
          {!a ? (
            <Skeleton className="mt-5 size-16 rounded-md" />
          ) : a.iconUrl ? (
            <Image
              src={a.iconUrl}
              alt=""
              width={64}
              height={64}
              className="mt-5 rounded-md border object-cover"
              unoptimized
            />
          ) : (
            <div className="bg-muted mt-5 size-16 rounded-md" />
          )}
          <div className="space-y-1">
            <BackLink />
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">
                {a?.name ?? <Skeleton className="h-7 w-48" />}
              </h1>
              {a &&
                (a.isActive ? (
                  <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
                ) : (
                  <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactivo" />
                ))}
            </div>
            {a && <p className="text-muted-foreground font-mono text-sm">{a.code}</p>}
          </div>
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
              <DetailRow label="Rareza">
                <AchievementTierBadge tier={a.tier} />
              </DetailRow>
              <DetailRow label="Recompensa">{rewardLabel(a)}</DetailRow>
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
              Re-otorgar premio
            </CardTitle>
            <CardDescription>
              Vuelve a pagar el premio completo (XP, Kokos y Kolones) a cada usuario que ya tiene
              el logro. Las monedas van por el ledger como ajuste manual; el XP suma a la liga de
              su módulo activo. No re-evalúa la condición.
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
                label="Premio por usuario"
                value={perUser ? rewardLabel(perUser) : '—'}
                icon={<CoinsIcon />}
                tone="amber"
                loading={preview.isLoading}
              />
              <KpiCard
                label="Costo total"
                value={
                  p
                    ? rewardLabel({
                        xpReward: p.totalXp,
                        kokosReward: p.totalKokos,
                        kolonesReward: p.totalKolones,
                      })
                    : '—'
                }
                icon={<WalletIcon />}
                tone="teal"
                loading={preview.isLoading}
              />
            </div>
            {!!p && p.affectedUsers === 0 && (
              <p className="text-muted-foreground text-sm">Nadie tiene este logro todavía.</p>
            )}
            {!!p && !paysSomething && (
              <p className="text-muted-foreground text-sm">
                El logro no otorga premio: la distinción es todo el valor, no hay nada que
                re-pagar.
              </p>
            )}
            <div className="flex justify-end">
              <Button disabled={!canRun || run.isPending} onClick={() => setConfirmOpen(true)}>
                <CoinsIcon className="size-4" />
                Re-otorgar premio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Re-otorgar premio"
        description={
          p && perUser
            ? `Se acreditará ${rewardLabel(perUser)} a ${p.affectedUsers} usuario(s) (${rewardLabel({ xpReward: p.totalXp, kokosReward: p.totalKokos, kolonesReward: p.totalKolones })} en total). No se puede deshacer.`
            : undefined
        }
        destructive
        confirmLabel="Re-otorgar"
        onConfirm={runRegrant}
      />
    </div>
  );
}
