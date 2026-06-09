import {
  CheckIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleXIcon,
  ClockIcon,
  SendIcon,
  type LucideIcon,
} from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import { STATUS_LABELS, type CampaignStatus } from '@/hooks/use-messaging';

// Faro de estado de campaña. Solo datos; presentación vía StatusBadge.
const STATUS_META: Record<CampaignStatus, { icon: LucideIcon; tone: StatusTone }> = {
  draft: { icon: CircleDashedIcon, tone: 'neutral' },
  pending_approval: { icon: ClockIcon, tone: 'warning' },
  approved: { icon: CheckIcon, tone: 'info' },
  sending: { icon: SendIcon, tone: 'info' },
  sent: { icon: CircleCheckIcon, tone: 'success' },
  failed: { icon: CircleXIcon, tone: 'destructive' },
  cancelled: { icon: CircleDashedIcon, tone: 'muted' },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const m = STATUS_META[status];
  return <StatusBadge tone={m.tone} icon={m.icon} label={STATUS_LABELS[status]} />;
}
