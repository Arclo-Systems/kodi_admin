import { toYMD } from '@/components/ui/date-picker';

/** Rango por defecto del reporte: los últimos `days` días, ambos incluidos. */
export function lastDays(days: number, now: Date): { from: string; to: string } {
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  return { from: toYMD(from), to: toYMD(now) };
}

/**
 * Clics sobre aperturas: sin aperturas no hay CTR (0/0 daría NaN y "0 %" mentiría
 * diciendo que nadie clickeó algo que nadie vio).
 */
export function ctrLabel(sheetOpens: number, linkClicks: number): string {
  if (sheetOpens <= 0) return '—';
  return `${Math.round((linkClicks / sheetOpens) * 100)}%`;
}
