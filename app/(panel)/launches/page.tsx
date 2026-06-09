import { requireAction } from '@/lib/guard';
import { LaunchesTabs } from './launches-tabs';

export const metadata = { title: 'Lanzamientos' };

export default async function LaunchesPage() {
  const user = await requireAction('view:launches');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lanzamientos</h1>
        <p className="text-muted-foreground">
          Versiones publicadas de la app y roadmap de lanzamiento por país.
        </p>
      </div>
      <LaunchesTabs role={user.role} isGlobalScope={user.isGlobalScope} />
    </div>
  );
}
