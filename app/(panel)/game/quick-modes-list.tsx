'use client';

import { GameTable } from '@/components/game/game-table';
import { GAME_STATUS_OPTIONS, GameStatusBadge, gameStatusLabel } from '@/lib/game-status';
import type { QuickModeRow } from '@/hooks/use-game';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CR');
const TYPE_LABELS: Record<string, string> = {
  contrarreloj: 'Contrarreloj',
  supervivencia: 'Supervivencia',
};

export function QuickModesList() {
  return (
    <GameTable<QuickModeRow>
      entity="quick-modes"
      statusOptions={GAME_STATUS_OPTIONS['quick-modes']}
      columns={[
        { header: 'Módulo', cell: (s) => s.module.shortName },
        { header: 'Usuario', cell: (s) => s.user.displayName },
        { header: 'Modo', cell: (s) => TYPE_LABELS[s.type] ?? s.type },
        {
          header: 'Estado',
          cell: (s) => (
            <GameStatusBadge value={s.status} label={gameStatusLabel('quick-modes', s.status)} />
          ),
        },
        { header: 'Aciertos', cell: (s) => `${s.questionsCorrect}/${s.questionsAnswered}` },
        { header: 'Inicio', cell: (s) => fmt(s.startedAt) },
      ]}
    />
  );
}
