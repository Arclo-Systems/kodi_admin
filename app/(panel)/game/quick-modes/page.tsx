import { requireAction } from '@/lib/guard';
import { COUNTRIES } from '@/lib/countries';
import { QuickModesTabs } from './quick-modes-tabs';

export const metadata = { title: 'Modos rápidos' };

export default async function QuickModesPage() {
  const user = await requireAction('view:game');
  // Países que el admin puede consultar (global → todos; regional → su scope).
  const allowedCountries = user.isGlobalScope
    ? COUNTRIES.map((c) => c.code)
    : user.assignedCountries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Modos rápidos</h1>
        <p className="text-muted-foreground">
          Contrarreloj y Supervivencia: inspección y anulación (reversa de Kolones).
        </p>
      </div>
      <QuickModesTabs allowedCountries={allowedCountries} />
    </div>
  );
}
