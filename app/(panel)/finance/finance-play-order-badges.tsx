'use client';

import type { PlayOrder, PlayOrderStatus } from '@/hooks/use-finance';
import { StatusBadge } from '@/lib/status-badge';
import { PLAY_ORDER_STATUS_BADGE, PLAY_ORDER_STATUS_LABELS, subtractMoney } from './finance-format';

export function PlayOrderStatusBadge({ status }: { status: PlayOrderStatus }) {
  const { tone, icon } = PLAY_ORDER_STATUS_BADGE[status];
  return <StatusBadge tone={tone} icon={icon} label={PLAY_ORDER_STATUS_LABELS[status]} />;
}

/**
 * El bruto que sí entra al libro: `total − impuesto`. No viaja en la respuesta
 * (el backend manda los tres montos crudos y la comisión derivada), así que se
 * deriva acá en céntimos enteros.
 *
 * `null` cuando la orden mezcla monedas: restar colones a dólares da un número
 * sin significado, y ese es justamente el caso que el backend deja sin asentar.
 */
export function playOrderGrossExTax(order: PlayOrder): string | null {
  if (order.totalCurrency !== order.taxCurrency) return null;
  return subtractMoney(order.totalAmount, order.taxAmount);
}
