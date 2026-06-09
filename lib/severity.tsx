import {
  AlertTriangleIcon,
  FlameIcon,
  type LucideIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReportSeverity } from '@/hooks/use-moderation';

type SeverityMeta = {
  label: string;
  Icon: LucideIcon;
  // Chip del ícono en las KPI cards (bg + text por token, AA en light y dark).
  chip: string;
  // Tint del badge en tablas/detalle (low/medium/high). `critical` usa variant destructive.
  badge: string;
};

// Faro de severidad: verde → ámbar → rojo (tint) → rojo (sólido en crítica).
// Solo tokens semánticos (success/warning/destructive) → contraste AA en ambos modos.
export const SEVERITY_META: Record<ReportSeverity, SeverityMeta> = {
  low: {
    label: 'Baja',
    Icon: ShieldCheckIcon,
    chip: 'bg-success/10 text-success',
    badge: 'border-success/40 bg-success/15 text-success',
  },
  medium: {
    label: 'Media',
    Icon: AlertTriangleIcon,
    chip: 'bg-warning/10 text-warning',
    badge: 'border-warning/40 bg-warning/15 text-warning',
  },
  high: {
    label: 'Alta',
    Icon: FlameIcon,
    chip: 'bg-destructive/10 text-destructive',
    badge: 'border-destructive/40 bg-destructive/15 text-destructive',
  },
  critical: {
    label: 'Crítica',
    Icon: ShieldAlertIcon,
    chip: 'bg-destructive/15 text-destructive',
    badge: '',
  },
};

export function SeverityBadge({ severity }: { severity: ReportSeverity }) {
  const m = SEVERITY_META[severity];
  const Icon = m.Icon;
  // Crítica = sólido (máxima alarma); el resto, tint.
  if (severity === 'critical') {
    return (
      <Badge variant="destructive" className="gap-1">
        <Icon className="size-3" />
        {m.label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn('gap-1', m.badge)}>
      <Icon className="size-3" />
      {m.label}
    </Badge>
  );
}
