import { CircleCheckIcon, ClockIcon, XCircleIcon, type LucideIcon } from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import type { CutoffStatus } from '@/hooks/use-cutoffs';

// Faro de estado de una subida de cortes. Solo datos; presentación vía StatusBadge.
export const CUTOFF_STATUS_META: Record<
  CutoffStatus,
  { label: string; icon: LucideIcon; tone: StatusTone }
> = {
  pending_review: { label: 'Pendiente', icon: ClockIcon, tone: 'warning' },
  applied: { label: 'Aplicada', icon: CircleCheckIcon, tone: 'success' },
  rejected: { label: 'Rechazada', icon: XCircleIcon, tone: 'destructive' },
};

export function CutoffStatusBadge({ status }: { status: CutoffStatus }) {
  const m = CUTOFF_STATUS_META[status];
  return <StatusBadge tone={m.tone} icon={m.icon} label={m.label} />;
}
