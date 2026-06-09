import { requireAction } from '@/lib/guard';
import { CareerUploadsTable } from './career-uploads-table';
import { CareersNav } from '../careers-nav';

export const metadata = { title: 'Subidas de carreras' };

export default async function CareerUploadsPage() {
  const user = await requireAction('content:career:upload');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subidas masivas de carreras</h1>
        <p className="text-muted-foreground">
          Subí un CSV por módulo y país; revisá el diff (insertar/actualizar) antes de aplicarlo. La
          aprobación es solo de admin.
        </p>
      </div>
      <CareersNav role={user.role} isGlobalScope={user.isGlobalScope} />
      <CareerUploadsTable />
    </div>
  );
}
