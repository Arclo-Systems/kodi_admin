'use client';

import type { ReactNode } from 'react';
import type { PlayOrder } from '@/hooks/use-finance';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PLAY_ORDER_STATUS_HINTS, formatAmount } from './finance-format';
import { PlayOrderStatusBadge, playOrderGrossExTax } from './finance-play-order-badges';

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border/60 flex items-start justify-between gap-4 border-b py-2.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-semibold break-words">{children}</dd>
    </div>
  );
}

const Vacio = () => <span className="text-muted-foreground font-normal">—</span>;

function Money({ amount, currency }: { amount: string | null; currency: string }) {
  if (amount === null) return <Vacio />;
  return <span className="tabular-nums">{formatAmount(amount, currency)}</span>;
}

/**
 * El detalle de una orden: qué cobró Google, qué se llevó, y —cuando no hay
 * asiento— por qué.
 *
 * Lo que devolvió la API de Google (`raw`) NO se muestra ni viaja en la lista:
 * guarda datos del comprador, y una pantalla del panel no es lugar para eso.
 */
export function FinancePlayOrderDialog({
  order,
  onOpenChange,
  formatDate,
}: {
  order: PlayOrder | null;
  onOpenChange: (open: boolean) => void;
  formatDate: (iso: string) => string;
}) {
  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {order && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-base break-all">{order.orderId}</DialogTitle>
              <DialogDescription>
                {order.subscriptionId ?? 'Suscripción sin identificar'} ·{' '}
                {formatDate(order.createTime)}
              </DialogDescription>
            </DialogHeader>

            <dl className="min-w-0">
              <Dato label="Estado del asiento">
                <PlayOrderStatusBadge status={order.postingStatus} />
              </Dato>
              <Dato label="Qué significa">
                <span className="font-normal">{PLAY_ORDER_STATUS_HINTS[order.postingStatus]}</span>
              </Dato>
              {order.postingError && (
                <Dato label="Motivo">
                  <span className="font-normal whitespace-pre-line">{order.postingError}</span>
                </Dato>
              )}
              <Dato label="Estado en Google">{order.state}</Dato>
              <Dato label="Bruto sin impuesto">
                <Money amount={playOrderGrossExTax(order)} currency={order.totalCurrency} />
              </Dato>
              <Dato label="Comisión de Google Play">
                <Money amount={order.commission} currency={order.totalCurrency} />
              </Dato>
              <Dato label="Neto para Kodi">
                <Money
                  amount={order.developerRevenue}
                  currency={order.developerRevenueCurrency}
                />
              </Dato>
              {/* El impuesto lo recauda y lo remite Google: no entra al libro. Se
                  muestra porque explica la diferencia entre lo que pagó la persona
                  y lo que se asienta. */}
              <Dato label="Impuesto (lo remite Google, no se asienta)">
                <Money amount={order.taxAmount} currency={order.taxCurrency} />
              </Dato>
              <Dato label="Total cobrado">
                <Money amount={order.totalAmount} currency={order.totalCurrency} />
              </Dato>
              <Dato label="Asiento">
                {order.journalEntryNumber ? (
                  <span className="tabular-nums">{order.journalEntryNumber}</span>
                ) : (
                  <Vacio />
                )}
              </Dato>
              <Dato label="Usuario">
                {order.userId ? (
                  <span className="font-mono text-xs break-all">{order.userId}</span>
                ) : (
                  <Vacio />
                )}
              </Dato>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
