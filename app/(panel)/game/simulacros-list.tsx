'use client';

import { GameTable } from '@/components/game/game-table';
import { GAME_STATUS_OPTIONS, GameStatusBadge, gameStatusLabel } from '@/lib/game-status';
import type { SimulacroRow } from '@/hooks/use-game';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CR');

export function SimulacrosList() {
  return (
    <GameTable<SimulacroRow>
      entity="simulacros"
      statusOptions={GAME_STATUS_OPTIONS.simulacros}
      columns={[
        { header: 'Módulo', cell: (s) => s.module.shortName },
        { header: 'Usuario', cell: (s) => s.user.displayName },
        {
          header: 'Estado',
          cell: (s) => <GameStatusBadge value={s.status} label={gameStatusLabel('simulacros', s.status)} />,
        },
        { header: 'Score', cell: (s) => (s.score != null ? s.score : '—') },
        { header: 'Inicio', cell: (s) => fmt(s.startedAt) },
      ]}
    />
  );
}
