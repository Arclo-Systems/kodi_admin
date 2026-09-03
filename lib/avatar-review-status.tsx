import {
  CircleCheckIcon,
  CircleDotIcon,
  ClockIcon,
  type LucideIcon,
  RefreshCwIcon,
  ShieldXIcon,
} from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import type { AvatarReviewStatus } from '@/hooks/use-avatar-reviews';

// Faro de estado de una foto de perfil en revisión. Solo datos; presentación vía StatusBadge.
const AVATAR_REVIEW_STATUS_META: Record<
  AvatarReviewStatus,
  { label: string; icon: LucideIcon; tone: StatusTone }
> = {
  pending: { label: 'Pendiente', icon: ClockIcon, tone: 'warning' },
  approved: { label: 'Aprobada', icon: CircleCheckIcon, tone: 'success' },
  rejected: { label: 'Rechazada', icon: ShieldXIcon, tone: 'destructive' },
  // El usuario subió otra foto antes de que llegara el turno de esta: ya no está en la app.
  superseded: { label: 'Reemplazada', icon: RefreshCwIcon, tone: 'muted' },
};

export const AVATAR_REVIEW_STATUS_LABELS: Record<AvatarReviewStatus, string> = {
  pending: AVATAR_REVIEW_STATUS_META.pending.label,
  approved: AVATAR_REVIEW_STATUS_META.approved.label,
  rejected: AVATAR_REVIEW_STATUS_META.rejected.label,
  superseded: AVATAR_REVIEW_STATUS_META.superseded.label,
};

export function AvatarReviewStatusBadge({ status }: { status: AvatarReviewStatus }) {
  const meta = AVATAR_REVIEW_STATUS_META[status] ?? {
    label: status,
    icon: CircleDotIcon,
    tone: 'muted' as const,
  };
  return <StatusBadge tone={meta.tone} icon={meta.icon} label={meta.label} />;
}
