import { requireAction } from '@/lib/guard';
import { COUNTRIES } from '@/lib/countries';
import { FundadorView } from './fundador-panel';

export const metadata = { title: 'Oferta fundador' };

export default async function FundadorPage() {
  const user = await requireAction('economy:monetization:read');
  const allowedCountries = user.isGlobalScope
    ? COUNTRIES.map((c) => c.code)
    : user.assignedCountries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Oferta fundador</h1>
        <p className="text-muted-foreground">
          Cupos de la promoción de lanzamiento: entregados, apartados durante el trial y
          disponibles.
        </p>
      </div>
      <FundadorView allowedCountries={allowedCountries} />
    </div>
  );
}
