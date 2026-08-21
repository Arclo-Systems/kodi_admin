import { requireAction } from '@/lib/guard';
import { COUNTRIES } from '@/lib/countries';
import { ReservasPanel } from './reservas-panel';

export const metadata = { title: 'Reservas de fundador' };

export default async function ReservasPage() {
  const user = await requireAction('economy:store-ops:read');
  const allowedCountries = user.isGlobalScope
    ? COUNTRIES.map((c) => c.code)
    : user.assignedCountries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reservas de fundador</h1>
        <p className="text-muted-foreground">
          Lugares apartados durante el trial. Un lugar apartado no hace fundador a nadie: eso pasa
          con el primer cobro.
        </p>
      </div>
      <ReservasPanel allowedCountries={allowedCountries} />
    </div>
  );
}
