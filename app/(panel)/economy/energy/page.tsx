import { requireAction } from '@/lib/guard';
import { EnergySettings } from './energy-settings';

export const metadata = { title: 'Energía y límites' };

export default async function EnergyPage() {
  await requireAction('economy:energy:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Energía y límites free</h1>
        <p className="text-muted-foreground">
          Config por país de la energía (tope, regeneración, costos) y de los límites del plan free.
          Default aplica a los países sin config propia.
        </p>
      </div>
      <EnergySettings />
    </div>
  );
}
