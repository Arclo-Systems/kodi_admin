import { CircleCheckIcon, CircleDashedIcon, ClockIcon, type LucideIcon } from 'lucide-react';
import type { StatusTone } from '@/lib/status-badge';

// Faro de estado de suscripción (única fuente; lo usan la tabla de economy y el detalle de usuario).
//
// Las claves son EXACTAMENTE el enum del contrato: trial | active | cancelled |
// expired | grace. Había además `canceled` (una sola L) y `paused`, que el
// backend no manda nunca: entradas muertas que hacían dudar de cuál era la
// buena al leer el archivo.
export const SUBSCRIPTION_STATUS: Record<string, { label: string; tone: StatusTone; icon: LucideIcon }> = {
  trial: { label: 'Prueba', tone: 'info', icon: ClockIcon },
  active: { label: 'Activa', tone: 'success', icon: CircleCheckIcon },
  grace: { label: 'Gracia', tone: 'warning', icon: ClockIcon },
  cancelled: { label: 'Cancelada', tone: 'muted', icon: CircleDashedIcon },
  expired: { label: 'Expirada', tone: 'muted', icon: CircleDashedIcon },
};

export function subscriptionStatusLabel(status: string): string {
  return SUBSCRIPTION_STATUS[status]?.label ?? status;
}
