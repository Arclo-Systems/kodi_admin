import {
  ArrowUpIcon,
  CircleCheckIcon,
  CircleDotIcon,
  EyeIcon,
  type LucideIcon,
  XIcon,
} from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';

// Faro de estado de un reporte de moderación. Solo datos; presentación vía StatusBadge.
const REPORT_STATUS_META: Record<
  string,
  { label: string; icon: LucideIcon; tone: StatusTone }
> = {
  open: { label: 'Abierto', icon: CircleDotIcon, tone: 'neutral' },
  in_review: { label: 'En revisión', icon: EyeIcon, tone: 'info' },
  actioned: { label: 'Accionado', icon: CircleCheckIcon, tone: 'success' },
  escalated: { label: 'Escalado', icon: ArrowUpIcon, tone: 'destructive' },
  dismissed: { label: 'Desestimado', icon: XIcon, tone: 'muted' },
};

export function ReportStatusBadge({ status }: { status: string }) {
  const m =
    REPORT_STATUS_META[status] ?? { label: status, icon: CircleDotIcon, tone: 'muted' as const };
  return <StatusBadge tone={m.tone} icon={m.icon} label={m.label} />;
}
