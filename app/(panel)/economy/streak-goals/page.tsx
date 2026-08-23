import { requireAction } from '@/lib/guard';
import { StreakGoalsSettings } from './streak-goals-settings';

export const metadata = { title: 'Metas de racha' };

export default async function StreakGoalsPage() {
  await requireAction('economy:rewards:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Metas de racha</h1>
        <p className="text-muted-foreground">
          Las opciones que el usuario elige al comprometerse con una racha, y los
          Kolones que gana al alcanzarlas. Default aplica a los países sin escala
          propia. Distinto del premio de cada día, que se configura en
          Recompensas.
        </p>
      </div>
      <StreakGoalsSettings />
    </div>
  );
}
