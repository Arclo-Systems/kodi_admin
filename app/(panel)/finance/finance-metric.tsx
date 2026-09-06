'use client';

import { CircleHelpIcon } from 'lucide-react';
import type { Metric, NotAvailable } from '@/hooks/use-finance-planning';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatMetricValue } from './finance-format';

/**
 * El N/A de la Fase 4, siempre igual en las cinco pantallas.
 *
 * Se pinta "N/A" y NO un cero, ni un guión, ni un infinito: un runway de "0,0
 * meses" y un runway que no se puede calcular llevan a decisiones opuestas, y un
 * "—" no dice cuál de las dos cosas es. El motivo viaja del backend en español y
 * se muestra tal cual —en el tooltip y también como `aria-label`, para que no
 * dependa de poder apuntar con el mouse.
 */
export function NotAvailableMark({
  reason,
  className,
}: {
  reason: NotAvailable | null;
  className?: string;
}) {
  const label = reason ? `N/A: ${reason.message}` : 'N/A';

  return (
    <Tooltip>
      {/* Sin `asChild`: Radix pone su propio `<button>`, que es focusable y se
          anuncia. Un `<span tabIndex={0})` queda fuera del árbol accesible. */}
      <TooltipTrigger
        aria-label={label}
        className={cn(
          'text-muted-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-md font-medium focus-visible:ring-2 focus-visible:outline-none',
          className,
        )}
      >
        N/A
        <CircleHelpIcon className="size-3.5" aria-hidden />
      </TooltipTrigger>
      <TooltipContent>{reason?.message ?? 'El dato no está disponible.'}</TooltipContent>
    </Tooltip>
  );
}

/**
 * El valor de una métrica, o su N/A. Nunca las dos cosas y nunca ninguna: el
 * backend construye `value` y `na` como excluyentes, y acá se respeta.
 */
export function MetricValue({
  metric,
  currency,
  className,
}: {
  metric: Metric;
  currency: string;
  className?: string;
}) {
  const formatted = formatMetricValue(metric, currency);
  if (formatted === null) return <NotAvailableMark reason={metric.na} className={className} />;
  return <span className={cn('tabular-nums', className)}>{formatted}</span>;
}
