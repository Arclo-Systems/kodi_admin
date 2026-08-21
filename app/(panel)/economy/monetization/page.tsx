import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { COUNTRIES } from '@/lib/countries';
import { MonetizationAnalytics } from './monetization-analytics';
import { StoreOpsNav, StoreOpsNavRegional } from './store-ops-nav';

export const metadata = { title: 'Monetización' };

export default async function MonetizationPage() {
  const user = await requireAction('economy:monetization:read');
  const allowedCountries = user.isGlobalScope
    ? COUNTRIES.map((c) => c.code)
    : user.assignedCountries;

  const verTienda = canWithScope(user.role, user.isGlobalScope, 'economy:store-ops:read');
  const verTiendaGlobal = canWithScope(user.role, user.isGlobalScope, 'economy:store-ops:global');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Monetización</h1>
        <p className="text-muted-foreground">
          Operación de compras de la tienda y analítica de suscripciones: incidencias, cupos de
          fundador, movimiento, conversión trial→pago y <strong>MRR estimado</strong>.
        </p>
      </div>

      {verTiendaGlobal && <StoreOpsNav />}
      {verTienda && !verTiendaGlobal && <StoreOpsNavRegional />}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Analítica de suscripciones</h2>
        <MonetizationAnalytics allowedCountries={allowedCountries} />
      </section>
    </div>
  );
}
