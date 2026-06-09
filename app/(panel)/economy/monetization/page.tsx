import { requireAction } from '@/lib/guard';
import { COUNTRIES } from '@/lib/countries';
import { MonetizationAnalytics } from './monetization-analytics';

export const metadata = { title: 'Monetización' };

export default async function MonetizationPage() {
  const user = await requireAction('economy:monetization:read');
  const allowedCountries = user.isGlobalScope
    ? COUNTRIES.map((c) => c.code)
    : user.assignedCountries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Monetización</h1>
        <p className="text-muted-foreground">
          Analítica de suscripciones: movimiento, conversión trial→pago y <strong>MRR estimado</strong>.
        </p>
      </div>
      <MonetizationAnalytics allowedCountries={allowedCountries} />
    </div>
  );
}
