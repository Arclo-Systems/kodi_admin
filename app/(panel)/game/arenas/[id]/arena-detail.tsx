'use client';

import { ClockIcon, ShieldIcon, TrophyIcon, UsersIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/admin/kpi-card';
import { GameDetailShell } from '@/components/game/game-detail-shell';
import { UserRef } from '@/components/game/user-ref';
import { durationLabel } from '@/components/game/game-bits';
import { cn } from '@/lib/utils';

const TYPE_LABEL: Record<string, string> = {
  rapida: 'Rápida',
  especial: 'Especial',
  amigos: 'Privada (amigos)',
};

export function ArenaDetail({ id, canAnnul }: { id: string; canAnnul: boolean }) {
  return (
    <GameDetailShell
      entity="arenas"
      id={id}
      title="Arena"
      canAnnul={canAnnul}
      awardedStatuses={['finished']}
    >
      {(d) => {
        const dur = durationLabel(d.startedAt, d.endedAt);
        return (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <KpiCard
                label="Tipo"
                value={d.type ? (TYPE_LABEL[d.type] ?? d.type) : '—'}
                icon={<ShieldIcon />}
                tone="teal"
              />
              <KpiCard
                label="Participantes"
                value={d.participants?.length ?? 0}
                icon={<UsersIcon />}
                tone="blue"
              />
              <KpiCard label="Duración" value={dur ?? '—'} icon={<ClockIcon />} tone="amber" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UsersIcon className="text-primary size-4" />
                  Participantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {(d.participants ?? []).map((p) => {
                  const isWinner = p.finalRank === 1;
                  return (
                    <div
                      key={p.userId}
                      className={cn(
                        'flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5',
                        isWinner && 'bg-success/5',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-medium tabular-nums',
                          isWinner ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {p.finalRank ?? '—'}
                      </span>
                      {isWinner && <TrophyIcon className="text-success size-4 shrink-0" aria-hidden />}
                      <UserRef id={p.userId} name={p.user.displayName} isBot={p.isBot} />
                      {p.eliminatedAt && <span className="text-destructive text-xs">· eliminado</span>}
                    </div>
                  );
                })}
                {(d.participants ?? []).length === 0 && (
                  <p className="text-muted-foreground">Sin participantes.</p>
                )}
              </CardContent>
            </Card>
          </>
        );
      }}
    </GameDetailShell>
  );
}
