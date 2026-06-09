import { requireAction } from '@/lib/guard';
import { SubscriptionPricesManager } from './subscription-prices-manager';

export const metadata = { title: 'Precios de suscripción' };

export default async function SubscriptionPricesPage() {
  await requireAction('economy:subscription-price:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Precios de suscripción</h1>
        <p className="text-muted-foreground">
          Precios por país, plan, período y tamaño (módulo suelto = 1, packs = 2+). Default (sin país)
          es el precio de respaldo. El cobro real lo pone la store; esto es referencia/display + MRR.
        </p>
      </div>
      <SubscriptionPricesManager />
    </div>
  );
}
