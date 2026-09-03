import { formatDistanceStrict } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Antigüedad legible de un instante ISO: "hace 3 días", "hace 5 minutos".
 *
 * En una cola de revisión el dato que decide es cuánto lleva esperando, no la fecha
 * exacta; la fecha absoluta se muestra aparte, como apoyo.
 */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return formatDistanceStrict(date, now, { addSuffix: true, locale: es });
}
