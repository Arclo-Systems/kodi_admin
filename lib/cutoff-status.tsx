import {
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  HistoryIcon,
  SparklesIcon,
  XCircleIcon,
  type LucideIcon,
} from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import type { CutoffMatchStatus, CutoffStatus } from '@/hooks/use-cutoffs';

// Faro de estado de una subida de cortes. Solo datos; presentación vía StatusBadge.
const CUTOFF_STATUS_META: Record<
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

// Estado del emparejamiento de un grupo (universidad + nombre oficial) del Excel de cortes.
const CUTOFF_MATCH_STATUS_META: Record<
  CutoffMatchStatus,
  { label: string; icon: LucideIcon; tone: StatusTone }
> = {
  alias: { label: 'Alias', icon: HistoryIcon, tone: 'info' },
  auto: { label: 'Auto', icon: SparklesIcon, tone: 'success' },
  suggested: { label: 'Sugerido', icon: ClockIcon, tone: 'warning' },
  unmatched: { label: 'Sin match', icon: CircleAlertIcon, tone: 'destructive' },
};

export function CutoffMatchStatusBadge({ status }: { status: CutoffMatchStatus }) {
  const m = CUTOFF_MATCH_STATUS_META[status];
  return <StatusBadge tone={m.tone} icon={m.icon} label={m.label} />;
}
