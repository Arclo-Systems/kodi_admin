import type { ReactNode } from 'react';
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type KpiTone = 'teal' | 'blue' | 'amber' | 'green' | 'red' | 'neutral';

// Tints suaves de marca para el chip del ícono (regla §Vida: color expresivo, no gris-sobre-blanco).
const TONE_CLASSES: Record<KpiTone, string> = {
  teal: 'bg-primary/10 text-primary',
  blue: 'bg-info/10 text-info',
  amber: 'bg-warning/10 text-warning',
  green: 'bg-success/10 text-success',
  red: 'bg-destructive/10 text-destructive',
  neutral: 'bg-muted text-muted-foreground',
};

export type KpiCardProps = {
  label: string;
  value: string | number;
  delta?: { value: number; direction: 'up' | 'down' | 'flat'; label?: string };
  // Verde si subir es bueno (DAU), rojo si subir es malo (churn).
  goodDirection?: 'up' | 'down';
  loading?: boolean;
  icon?: ReactNode;
  tone?: KpiTone;
  // Override del color del chip (clases bg/text). Si se pasa, ignora `tone`.
  iconClassName?: string;
};

export function KpiCard(props: KpiCardProps) {
  const goodDir = props.goodDirection ?? 'up';
  const tone = props.tone ?? 'teal';

  const positiveDelta =
    props.delta &&
    ((goodDir === 'up' && props.delta.direction === 'up') ||
      (goodDir === 'down' && props.delta.direction === 'down'));

  const negativeDelta =
    props.delta &&
    ((goodDir === 'up' && props.delta.direction === 'down') ||
      (goodDir === 'down' && props.delta.direction === 'up'));

  const Icon =
    props.delta?.direction === 'up'
      ? TrendingUpIcon
      : props.delta?.direction === 'down'
        ? TrendingDownIcon
        : MinusIcon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{props.label}</CardTitle>
        {props.icon && (
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4',
              props.iconClassName ?? TONE_CLASSES[tone],
            )}
          >
            {props.icon}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {props.loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold tabular-nums">{props.value}</div>
        )}
        {props.delta && !props.loading && (
          <p
            className={cn(
              'mt-1 flex items-center gap-1 text-xs',
              positiveDelta && 'text-success',
              negativeDelta && 'text-destructive',
              !positiveDelta && !negativeDelta && 'text-muted-foreground',
            )}
          >
            <Icon className="size-3" />
            {props.delta.value > 0 && '+'}
            {props.delta.value}%
            {props.delta.label && <span className="text-muted-foreground">{props.delta.label}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
