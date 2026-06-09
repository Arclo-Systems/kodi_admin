import { CircleCheckIcon, CircleDashedIcon, ClockIcon, PauseIcon, type LucideIcon } from 'lucide-react';
import type { StatusTone } from '@/lib/status-badge';

// Faro de estado de suscripción (única fuente; lo usan la tabla de economy y el detalle de usuario).
export const SUBSCRIPTION_STATUS: Record<string, { label: string; tone: StatusTone; icon: LucideIcon }> = {
  trial: { label: 'Prueba', tone: 'info', icon: ClockIcon },
  active: { label: 'Activa', tone: 'success', icon: CircleCheckIcon },
  grace: { label: 'Gracia', tone: 'warning', icon: ClockIcon },
  cancelled: { label: 'Cancelada', tone: 'muted', icon: CircleDashedIcon },
  canceled: { label: 'Cancelada', tone: 'muted', icon: CircleDashedIcon },
  expired: { label: 'Expirada', tone: 'muted', icon: CircleDashedIcon },
  paused: { label: 'Pausada', tone: 'muted', icon: PauseIcon },
};

export function subscriptionStatusLabel(status: string): string {
  return SUBSCRIPTION_STATUS[status]?.label ?? status;
}
