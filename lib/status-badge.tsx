import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Faro de estado del panel: ÚNICA fuente de la convención (outline + icono + color + texto).
// Los dominios solo declaran {label, icon, tone}; nunca repiten el markup ni los strings de color.
export type StatusTone = 'success' | 'info' | 'warning' | 'destructive' | 'muted' | 'neutral';

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  success: 'border-success/40 bg-success/15 text-success',
  info: 'border-info/40 bg-info/15 text-info',
  warning: 'border-warning/40 bg-warning/15 text-warning',
  destructive: 'border-destructive/40 bg-destructive/15 text-destructive',
  muted: 'text-muted-foreground',
  neutral: 'text-foreground',
};

export function StatusBadge({
  tone,
  icon: Icon,
  label,
  className,
}: {
  tone: StatusTone;
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn('gap-1', STATUS_TONE_CLASS[tone], className)}>
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}
