'use client';

import Link from 'next/link';
import { CalendarPlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameTable } from '@/components/game/game-table';
import { GAME_STATUS_OPTIONS, GameStatusBadge, gameStatusLabel } from '@/lib/game-status';
import type { ArenaRow } from '@/hooks/use-game';
import { formatDate } from '@/lib/format-date';


export function ArenasList({ canSchedule }: { canSchedule?: boolean }) {
  return (
    <GameTable<ArenaRow>
      entity="arenas"
      statusOptions={GAME_STATUS_OPTIONS.arenas}
      action={
        canSchedule ? (
          <Button asChild size="sm" className="ml-auto">
            <Link href="/game/arenas/schedule">
              <CalendarPlusIcon className="size-4" />
              Programar Arena Especial
            </Link>
          </Button>
        ) : undefined
      }
      columns={[
        { header: 'Módulo', cell: (a) => a.module.shortName },
        { header: 'Tipo', cell: (a) => a.type },
        {
          header: 'Estado',
          cell: (a) => <GameStatusBadge value={a.status} label={gameStatusLabel('arenas', a.status)} />,
        },
        { header: 'Participantes', cell: (a) => a.participantCount },
        { header: 'Inicio', cell: (a) => formatDate(a.startedAt) },
      ]}
    />
  );
}
