import { BanIcon, CircleCheckIcon, CircleDashedIcon, ClockIcon, type LucideIcon } from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import type { GameEntity } from '@/hooks/use-game';

// Fuente única de estados por entidad de juego (filtros + etiquetas + badges).
export const GAME_STATUS_OPTIONS: Record<GameEntity, { value: string; label: string }[]> = {
  matches: [
    { value: 'player1_won', label: 'Ganó jugador 1' },
    { value: 'player2_won', label: 'Ganó jugador 2' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'cancelled_timeout', label: 'Cancelada (timeout)' },
    { value: 'annulled', label: 'Anulada' },
  ],
  arenas: [
    { value: 'waiting', label: 'Esperando' },
    { value: 'active', label: 'Activa' },
    { value: 'finished', label: 'Terminada' },
    { value: 'annulled', label: 'Anulada' },
  ],
  simulacros: [
    { value: 'active', label: 'Activo' },
    { value: 'completed', label: 'Completado' },
    { value: 'abandoned', label: 'Abandonado' },
    { value: 'annulled', label: 'Anulado' },
  ],
  'quick-modes': [
    { value: 'active', label: 'Activa' },
    { value: 'completed', label: 'Completada' },
    { value: 'game_over', label: 'Sin vidas' },
    { value: 'annulled', label: 'Anulada' },
  ],
};

export function gameStatusLabel(entity: GameEntity, value: string): string {
  return GAME_STATUS_OPTIONS[entity].find((o) => o.value === value)?.label ?? value;
}

// Tono e icono del faro por palabra clave del valor (mismo criterio semántico).
function gameStatusTone(value: string): StatusTone {
  if (/annull/i.test(value)) return 'destructive';
  if (/(won|completed|finished|passed)/i.test(value)) return 'success';
  if (/(cancel|timeout|abandon|expired|failed)/i.test(value)) return 'muted';
  if (/(active|progress|live|waiting|pending|scheduled)/i.test(value)) return 'info';
  return 'neutral';
}

function gameStatusIcon(value: string): LucideIcon {
  if (/annull/i.test(value)) return BanIcon;
  if (/(won|completed|finished|passed)/i.test(value)) return CircleCheckIcon;
  if (/(cancel|timeout|abandon|expired|failed)/i.test(value)) return CircleDashedIcon;
  if (/(active|progress|live|waiting|pending|scheduled)/i.test(value)) return ClockIcon;
  return CircleDashedIcon;
}

export function GameStatusBadge({ value, label }: { value: string; label: string }) {
  return <StatusBadge tone={gameStatusTone(value)} icon={gameStatusIcon(value)} label={label} />;
}
