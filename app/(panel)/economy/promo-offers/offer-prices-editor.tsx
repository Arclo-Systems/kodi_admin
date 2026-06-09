'use client';

import { useState } from 'react';
import { SaveIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlanBadge } from '@/lib/plans';
import { usePromoOfferMutations, type OfferPrice, type PriceRow } from '@/hooks/use-promo-offers';

const PLANS = ['basico', 'plus', 'pro'] as const;
const PERIODS = ['monthly', 'quarterly', 'yearly'] as const;
const PACKS = [1, 2, 3, 4] as const;
const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};
const packLabel = (n: number) => (n === 1 ? 'Suelto' : `Pack ${n}`);
const key = (plan: string, period: string, pack: number) => `${plan}|${period}|${pack}`;

// Editor del grid de precios de una oferta explicit (plan × período × pack). Guarda todo de una
// (PUT /:id/prices reemplaza la grilla). Valores en la moneda del país (sin céntimos, como el resto).
export function OfferPricesEditor({ offerId, prices }: { offerId: string; prices: OfferPrice[] }) {
  const { setPrices } = usePromoOfferMutations();
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of prices) init[key(p.plan, p.period, p.packSize)] = String(p.priceCents);
    return init;
  });

  function set(plan: string, period: string, pack: number, value: string): void {
    setGrid((g) => ({ ...g, [key(plan, period, pack)]: value }));
  }

  async function save(): Promise<void> {
    setError(null);
    const rows: PriceRow[] = [];
    for (const period of PERIODS) {
      for (const pack of PACKS) {
        for (const plan of PLANS) {
          const raw = grid[key(plan, period, pack)];
          if (raw === undefined || raw === '') continue;
          const n = Number(raw);
          if (!Number.isInteger(n) || n < 0) {
            setError(`Precio inválido en ${plan} · ${PERIOD_LABELS[period]} · ${packLabel(pack)}`);
            return;
          }
          rows.push({ plan, period, packSize: pack, priceCents: n });
        }
      }
    }
    if (rows.length === 0) {
      setError('Cargá al menos un precio.');
      return;
    }
    try {
      await setPrices.mutateAsync({ id: offerId, prices: rows });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando los precios');
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Grilla de precios de oferta</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Período</TableHead>
            <TableHead>Tamaño</TableHead>
            {PLANS.map((p) => (
              <TableHead key={p}>
                <PlanBadge plan={p} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERIODS.flatMap((period) =>
            PACKS.map((pack) => (
              <TableRow key={`${period}-${pack}`}>
                <TableCell className="text-muted-foreground">{PERIOD_LABELS[period]}</TableCell>
                <TableCell className="text-muted-foreground">{packLabel(pack)}</TableCell>
                {PLANS.map((plan) => (
                  <TableCell key={plan}>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      aria-label={`${plan} ${PERIOD_LABELS[period]} ${packLabel(pack)}`}
                      value={grid[key(plan, period, pack)] ?? ''}
                      onChange={(e) => set(plan, period, pack, e.target.value)}
                      className="w-24"
                    />
                  </TableCell>
                ))}
              </TableRow>
            )),
          )}
        </TableBody>
      </Table>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={setPrices.isPending}>
          <SaveIcon className="size-4" />
          {setPrices.isPending ? 'Guardando…' : 'Guardar precios'}
        </Button>
      </div>
    </div>
  );
}
