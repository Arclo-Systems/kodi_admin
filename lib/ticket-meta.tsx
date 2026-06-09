import {
  BugIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CircleHelpIcon,
  ClockIcon,
  type LucideIcon,
  LightbulbIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';

// Semáforo de tipo de ticket: Pregunta (cielo) · Sugerencia (verde) · Bug (rojo).
// Solo tokens semánticos → contraste AA en light y dark.
type TypeMeta = { label: string; Icon: LucideIcon; chip: string; badge: string };

export const TICKET_TYPE_META: Record<string, TypeMeta> = {
  question_report: {
    label: 'Pregunta',
    Icon: CircleHelpIcon,
    chip: 'bg-info/10 text-info',
    badge: 'border-info/40 bg-info/15 text-info',
  },
  suggestion: {
    label: 'Sugerencia',
    Icon: LightbulbIcon,
    chip: 'bg-success/10 text-success',
    badge: 'border-success/40 bg-success/15 text-success',
  },
  bug_report: {
    label: 'Bug',
    Icon: BugIcon,
    chip: 'bg-destructive/10 text-destructive',
    badge: 'border-destructive/40 bg-destructive/15 text-destructive',
  },
};

export const TICKET_STATUS_META: Record<
  string,
  { label: string; icon: LucideIcon; tone: StatusTone }
> = {
  open: { label: 'Abierto', icon: CircleDotIcon, tone: 'neutral' },
  triaging: { label: 'En triage', icon: ClockIcon, tone: 'info' },
  resolved: { label: 'Resuelto', icon: CircleCheckIcon, tone: 'success' },
  dismissed: { label: 'Descartado', icon: CircleDashedIcon, tone: 'muted' },
};

export function TicketTypeBadge({ type }: { type: string }) {
  const m = TICKET_TYPE_META[type];
  if (!m) return <Badge variant="outline">{type}</Badge>;
  const Icon = m.Icon;
  return (
    <Badge variant="outline" className={cn('gap-1', m.badge)}>
      <Icon className="size-3" />
      {m.label}
    </Badge>
  );
}

export function TicketStatusBadge({ status }: { status: string }) {
  const m =
    TICKET_STATUS_META[status] ?? { label: status, icon: CircleDashedIcon, tone: 'muted' as const };
  return <StatusBadge tone={m.tone} icon={m.icon} label={m.label} />;
}
