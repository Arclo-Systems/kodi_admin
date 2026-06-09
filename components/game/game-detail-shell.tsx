'use client';

import { type ReactNode } from 'react';
import { BanIcon, CalendarIcon, ClockIcon, MapPinIcon, ShieldAlertIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnnulButton } from './annul-button';
import { SuspicionPanel } from './suspicion-panel';
import { MetaStrip, durationLabel, fmtDateTime } from './game-bits';
import { GameStatusBadge, gameStatusLabel } from '@/lib/game-status';
import { useGameDetail, type GameDetail, type GameEntity } from '@/hooks/use-game';

// Cabecera + sospecha + botón anular comunes a los modos; el body específico va por children.
export function GameDetailShell({
  entity,
  id,
  title,
  canAnnul,
  awardedStatuses,
  children,
}: {
  entity: GameEntity;
  id: string;
  title: string;
  canAnnul: boolean;
  awardedStatuses: string[];
  children: (detail: GameDetail) => ReactNode;
}) {
  const { data, isLoading, isError } = useGameDetail(entity, id);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) {
    return <p className="text-destructive text-sm">No se pudo cargar el detalle.</p>;
  }

  const annullable = awardedStatuses.includes(data.status) && !data.annulledAt;
  const duration = durationLabel(data.startedAt, data.endedAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{title}</h1>
            <GameStatusBadge value={data.status} label={gameStatusLabel(entity, data.status)} />
            {data.annulledAt && <Badge variant="destructive">Anulada</Badge>}
          </div>
          <MetaStrip
            items={[
              { icon: MapPinIcon, label: `${data.module.fullName} · ${data.module.country}` },
              { icon: CalendarIcon, label: fmtDateTime(data.startedAt) },
              ...(duration ? [{ icon: ClockIcon, label: duration }] : []),
            ]}
          />
        </div>
        {canAnnul && <AnnulButton entity={entity} id={id} disabled={!annullable} />}
      </div>

      {data.annulledAt && data.annulReason && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm">
          <BanIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-medium">Anulada:</span> {data.annulReason}
          </span>
        </div>
      )}

      {children(data)}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlertIcon className="text-warning size-4" />
            Indicadores de sospecha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SuspicionPanel suspicion={data.suspicion} />
        </CardContent>
      </Card>
    </div>
  );
}
