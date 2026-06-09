import { requireAction } from '@/lib/guard';
import { SegmentsManager } from './segments-manager';
import { MessagingNav } from '../messaging-nav';

export const metadata = { title: 'Segmentos' };

export default async function MessagingSegmentsPage() {
  const user = await requireAction('messaging:segments');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Segmentos</h1>
        <p className="text-muted-foreground">
          Audiencias reutilizables por país, plan y actividad. El conteo se refresca a diario.
        </p>
      </div>
      <MessagingNav role={user.role} isGlobalScope={user.isGlobalScope} />
      <SegmentsManager />
    </div>
  );
}
