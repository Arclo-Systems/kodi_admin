import {
  CalendarClockIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleSlashIcon,
  ClockIcon,
  LockIcon,
  MessageCircleIcon,
  RotateCcwIcon,
  SendIcon,
  type LucideIcon,
} from 'lucide-react';
import type { StatusTone } from '@/lib/status-badge';
import type { DeliveryStatus, RaffleStatus } from '@/hooks/use-raffles';

// Faro de estado de premiación (única fuente; lo usan la tabla y el detalle).
export const RAFFLE_STATUS_FARO: Record<RaffleStatus, { tone: StatusTone; icon: LucideIcon }> = {
  scheduled: { tone: 'info', icon: CalendarClockIcon },
  open: { tone: 'neutral', icon: CircleDotIcon },
  closed: { tone: 'warning', icon: LockIcon },
  awarded: { tone: 'success', icon: CircleCheckIcon },
  awarded_pending_review: { tone: 'info', icon: ClockIcon },
  awarded_final: { tone: 'success', icon: CircleCheckIcon },
  reverted: { tone: 'destructive', icon: RotateCcwIcon },
};

// Faro de estado de entrega del premio a cada ganador.
export const DELIVERY_FARO: Record<DeliveryStatus, { tone: StatusTone; icon: LucideIcon }> = {
  notified: { tone: 'info', icon: SendIcon },
  contacted: { tone: 'warning', icon: MessageCircleIcon },
  delivered: { tone: 'success', icon: CircleCheckIcon },
  unresponsive: { tone: 'destructive', icon: CircleSlashIcon },
};
