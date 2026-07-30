import { CircleCheckIcon, CircleDashedIcon, ClockIcon, type LucideIcon } from 'lucide-react';
import type { StatusTone } from '@/lib/status-badge';

// Faro de estado de solicitudes de beca (única fuente del markup de estado).
export const SCHOLARSHIP_STATUS: Record<string, { label: string; tone: StatusTone; icon: LucideIcon }> = {
  pending: { label: 'Pendiente', tone: 'warning', icon: ClockIcon },
  approved: { label: 'Aprobada', tone: 'success', icon: CircleCheckIcon },
  rejected: { label: 'Rechazada', tone: 'muted', icon: CircleDashedIcon },
};

export function scholarshipStatusLabel(status: string): string {
  return SCHOLARSHIP_STATUS[status]?.label ?? status;
}
