'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowLeftIcon,
  GiftIcon,
  MedalIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  TrophyIcon,
  TruckIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useRaffle,
  useRaffleActions,
  RAFFLE_STATUS_LABELS,
  DELIVERY_LABELS,
  type RaffleWinner,
} from '@/hooks/use-raffles';
import { StatusBadge } from '@/lib/status-badge';
import { RAFFLE_STATUS_FARO, DELIVERY_FARO } from '@/lib/raffle-status';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { CompleteRaffleForm } from './complete-raffle-form';
import { WinnerDeliveryDialog } from './winner-delivery-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { COUNTRIES } from '@/lib/countries';

function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-semibold">{children}</dd>
    </div>
  );
}

function fmtDateTime(d: string | null): string {
  return d ? new Date(d).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

export function RaffleDetail({ id }: { id: string }) {
  const { data: raffle, isLoading } = useRaffle(id);
  const { revert, replaceWinner } = useRaffleActions(id);
  const [dialogWinner, setDialogWinner] = useState<RaffleWinner | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<RaffleWinner | null>(null);
  const [revertOpen, setRevertOpen] = useState(false);

  const columns = useMemo<ColumnDef<RaffleWinner, unknown>[]>(
    () => [
      { accessorKey: 'position', header: '#', meta: { label: 'Puesto' } },
      {
        id: 'user',
        header: 'Ganador',
        meta: { label: 'Ganador' },
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.user?.displayName ?? row.original.userId.slice(0, 8)}
            {row.original.isReplacement && (
              <Badge variant="outline" className="ml-2">
                Reemplazo
              </Badge>
            )}
          </span>
        ),
      },
      {
        id: 'delivery',
        header: 'Entrega',
        meta: { label: 'Entrega' },
        cell: ({ row }) => {
          const faro = DELIVERY_FARO[row.original.deliveryStatus];
          return (
            <StatusBadge tone={faro.tone} icon={faro.icon} label={DELIVERY_LABELS[row.original.deliveryStatus]} />
          );
        },
      },
      {
        id: 'deliveredAt',
        header: 'Entregado',
        meta: { label: 'Entregado' },
        cell: ({ row }) => fmtDateTime(row.original.prizeDeliveredAt),
      },
      {
        id: 'actions',
        header: '',
        meta: { label: 'Acciones' },
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setDialogWinner(row.original)}>
              <TruckIcon className="size-4" />
              Entrega
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => setReplaceTarget(row.original)}
            >
              <RefreshCwIcon className="size-4" />
              Reemplazar
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (!isLoading && !raffle) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">No se encontró la premiación.</p>
      </div>
    );
  }

  const editable = !!raffle && ['scheduled', 'open', 'closed'].includes(raffle.status);
  const reversible =
    !!raffle &&
    raffle.status === 'awarded_pending_review' &&
    !!raffle.reversibleUntil &&
    new Date(raffle.reversibleUntil) > new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <BackLink />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">
              {raffle?.name ?? <Skeleton className="h-7 w-48" />}
            </h1>
            {raffle &&
              (() => {
                const faro = RAFFLE_STATUS_FARO[raffle.status];
                return (
                  <StatusBadge tone={faro.tone} icon={faro.icon} label={RAFFLE_STATUS_LABELS[raffle.status]} />
                );
              })()}
          </div>
          {raffle && (
            <p className="text-muted-foreground">
              {String(raffle.cycleMonth).padStart(2, '0')}/{raffle.cycleYear} · {raffle.country} ·{' '}
              {countryLabel(raffle.country)} · {raffle.moduleShortName}
            </p>
          )}
        </div>
        {reversible && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive shrink-0"
            onClick={() => setRevertOpen(true)}
          >
            <RotateCcwIcon className="size-4" />
            Revertir
          </Button>
        )}
      </div>

      {raffle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrophyIcon className="text-primary size-4" />
              Detalle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {raffle.prizeImageUrl && (
              <Image
                src={raffle.prizeImageUrl}
                alt="Imagen del premio"
                width={96}
                height={96}
                className="rounded-md border object-cover"
                unoptimized
              />
            )}
            <dl className="[&>div:last-child]:border-b-0">
              <Stat label="Premio">{raffle.prizeDescription}</Stat>
              <Stat label="Sponsor">{raffle.sponsor?.name ?? 'Sin sponsor'}</Stat>
              <Stat label="Cantidad de premios">{raffle.prizesCount}</Stat>
              <Stat label="Sorteo">{fmtDateTime(raffle.drawAt)}</Stat>
              <Stat label="Otorgada">{fmtDateTime(raffle.awardedAt)}</Stat>
              <Stat label="Reversible hasta">{fmtDateTime(raffle.reversibleUntil)}</Stat>
            </dl>
          </CardContent>
        </Card>
      )}

      {raffle && editable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GiftIcon className="text-primary size-4" />
              Completar premiación
            </CardTitle>
            <CardDescription>
              Definí premio, sponsor y cantidad de premios antes del sorteo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompleteRaffleForm raffle={raffle} />
          </CardContent>
        </Card>
      )}

      {raffle && raffle.winners.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MedalIcon className="text-primary size-5" />
            Ganadores ({raffle.winners.length})
          </h2>
          <DataTable
            columns={columns}
            data={raffle.winners}
            total={raffle.winners.length}
            page={1}
            pageSize={raffle.winners.length || 1}
            onPageChange={() => {}}
            emptyMessage="Sin ganadores"
          />
        </div>
      )}

      {dialogWinner && (
        <WinnerDeliveryDialog
          raffleId={id}
          winner={dialogWinner}
          onClose={() => setDialogWinner(null)}
        />
      )}

      <ConfirmDialog
        open={!!replaceTarget}
        onOpenChange={(o) => !o && setReplaceTarget(null)}
        title="Reemplazar ganador"
        description={
          replaceTarget
            ? `Se redesignará al siguiente elegible por mérito en lugar de ${replaceTarget.user?.displayName ?? 'este ganador'}. No se puede deshacer.`
            : undefined
        }
        destructive
        confirmLabel="Reemplazar"
        onConfirm={async () => {
          if (!replaceTarget) return;
          await replaceWinner.mutateAsync(replaceTarget.id);
          toast.success('Ganador reemplazado');
        }}
      />

      <ConfirmDialog
        open={revertOpen}
        onOpenChange={setRevertOpen}
        title="Revertir premiación"
        description="Se borran los ganadores y la premiación vuelve a estado revertido. Solo dentro de la ventana de 24h."
        destructive
        confirmLabel="Revertir"
        onConfirm={async () => {
          await revert.mutateAsync();
          toast.success('Premiación revertida');
        }}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/economy/raffles"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeftIcon className="size-3" />
      Premiaciones
    </Link>
  );
}
