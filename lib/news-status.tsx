import { CircleCheckIcon, CircleDashedIcon, ClockIcon, type LucideIcon } from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import type { NewsStatus } from '@/hooks/use-news';

// Faro de estados de noticia. Solo datos; presentación vía StatusBadge.
export const NEWS_STATUS_META: Record<
  NewsStatus,
  { label: string; icon: LucideIcon; tone: StatusTone }
> = {
  draft: { label: 'Borrador', icon: CircleDashedIcon, tone: 'muted' },
  scheduled: { label: 'Programada', icon: ClockIcon, tone: 'info' },
  published: { label: 'Publicada', icon: CircleCheckIcon, tone: 'success' },
};

export function NewsStatusBadge({ status }: { status: NewsStatus }) {
  const m = NEWS_STATUS_META[status];
  return <StatusBadge tone={m.tone} icon={m.icon} label={m.label} />;
}
