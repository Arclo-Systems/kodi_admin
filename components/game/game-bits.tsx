import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const fmtDateTime = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export function durationLabel(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const min = Math.round(ms / 60_000);
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

// Tira de metadatos con iconos para la cabecera (módulo · fecha · duración).
export function MetaStrip({ items }: { items: { icon: LucideIcon; label: string }[] }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <span key={it.label} className="inline-flex items-center gap-1.5">
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {it.label}
          </span>
        );
      })}
    </div>
  );
}

// Barra de precisión con tono semántico por porcentaje (verde/ámbar/rojo).
export function AccuracyBar({
  correct,
  total,
  label = 'Precisión',
  className,
}: {
  correct: number;
  total: number;
  label?: string;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const tone = pct >= 80 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {correct}/{total} · {pct}%
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-[width,background-color] duration-300 ease-out', tone)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
