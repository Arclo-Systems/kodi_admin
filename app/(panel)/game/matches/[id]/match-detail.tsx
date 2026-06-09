'use client';

import { CrownIcon, LayersIcon, ListOrderedIcon, SwordsIcon, UsersIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/admin/kpi-card';
import { GameDetailShell } from '@/components/game/game-detail-shell';
import { UserRef } from '@/components/game/user-ref';
import { cn } from '@/lib/utils';
import type { GameDetail } from '@/hooks/use-game';

const MODE_LABEL: Record<string, string> = {
  vs_random: 'Aleatoria',
  vs_friend: 'Privada (amigos)',
};

type Player = NonNullable<GameDetail['player1']>;

function PlayerChip({ player, isWinner }: { player: Player | null | undefined; isWinner: boolean }) {
  if (!player) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2',
        isWinner ? 'border-success/40 bg-success/5' : 'border-border',
      )}
    >
      {isWinner && <CrownIcon className="text-success size-4 shrink-0" aria-hidden />}
      <UserRef id={player.id} name={player.displayName} isBot={player.isBot} />
    </div>
  );
}

export function MatchDetail({ id, canAnnul }: { id: string; canAnnul: boolean }) {
  return (
    <GameDetailShell
      entity="matches"
      id={id}
      title="Partida"
      canAnnul={canAnnul}
      awardedStatuses={['player1_won', 'player2_won']}
    >
      {(d) => {
        const winnerId = d.winner?.id;
        return (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <KpiCard
                label="Modo"
                value={d.mode ? (MODE_LABEL[d.mode] ?? d.mode) : '—'}
                icon={<SwordsIcon />}
                tone="teal"
              />
              <KpiCard label="Turnos" value={d.turns?.length ?? 0} icon={<ListOrderedIcon />} tone="blue" />
              <KpiCard label="Materias" value={d.subjects?.length ?? 0} icon={<LayersIcon />} tone="amber" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UsersIcon className="text-primary size-4" />
                  Jugadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3">
                  <PlayerChip player={d.player1} isWinner={!!winnerId && winnerId === d.player1?.id} />
                  <span className="text-muted-foreground text-sm font-semibold">VS</span>
                  <PlayerChip player={d.player2} isWinner={!!winnerId && winnerId === d.player2?.id} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <SwordsIcon className="text-info size-4" />
                  Turnos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {(d.turns ?? []).map((t) => (
                  <div key={t.turnNumber} className="flex items-center gap-2">
                    <span className="bg-muted inline-flex size-6 items-center justify-center rounded-md text-xs font-medium tabular-nums">
                      {t.turnNumber}
                    </span>
                    <span className="text-muted-foreground">{t.questionsAnswered} resp ·</span>
                    {t.allCorrect ? (
                      <span className="text-success">todas correctas</span>
                    ) : (
                      <span className="text-warning">con errores</span>
                    )}
                  </div>
                ))}
                {(d.turns ?? []).length === 0 && (
                  <p className="text-muted-foreground">Sin turnos.</p>
                )}
              </CardContent>
            </Card>
          </>
        );
      }}
    </GameDetailShell>
  );
}
