import { requireAction } from '@/lib/guard';
import { ModerationTable } from './moderation-table';

export const metadata = { title: 'Moderación' };

export default async function ModerationPage() {
  await requireAction('view:moderation');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Moderación</h1>
        <p className="text-muted-foreground">
          Cola de denuncias y flags automáticos. Revisá, accioná (vía el detalle del usuario) o desestimá.
        </p>
      </div>
      <ModerationTable />
    </div>
  );
}
