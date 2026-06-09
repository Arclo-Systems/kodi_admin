'use client';

import { GameTable } from '@/components/game/game-table';
import { GAME_STATUS_OPTIONS, GameStatusBadge, gameStatusLabel } from '@/lib/game-status';
import type { MatchRow } from '@/hooks/use-game';

const player = (p: MatchRow['player1']) =>
  p ? `${p.displayName}${p.isBot ? ' (bot)' : ''}` : '—';
const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CR');

export function MatchesList() {
  return (
    <GameTable<MatchRow>
      entity="matches"
      statusOptions={GAME_STATUS_OPTIONS.matches}
      columns={[
        { header: 'Módulo', cell: (m) => m.module.shortName },
        {
          header: 'Jugadores',
          cell: (m) => `${player(m.player1)} vs ${player(m.player2)}`,
        },
        {
          header: 'Estado',
          cell: (m) => <GameStatusBadge value={m.status} label={gameStatusLabel('matches', m.status)} />,
        },
        { header: 'Inicio', cell: (m) => fmt(m.startedAt) },
      ]}
    />
  );
}
