import { requireAction } from '@/lib/guard';
import { RewardsSettings } from './rewards-settings';

export const metadata = { title: 'Recompensas' };

export default async function RewardsPage() {
  await requireAction('economy:rewards:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recompensas</h1>
        <p className="text-muted-foreground">
          Cuánto paga cada modo de juego, estudio y hábito (XP, Kolones, Kokos), por país.
          Default aplica a los países sin config propia; sin guardar, rigen los valores históricos.
        </p>
      </div>
      <RewardsSettings />
    </div>
  );
}
