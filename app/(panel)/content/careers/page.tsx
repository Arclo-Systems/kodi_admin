import { redirect } from 'next/navigation';
import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { CareersTable } from './careers-table';
import { CareersNav } from './careers-nav';

export const metadata = { title: 'Carreras' };

export default async function CareersPage() {
  const user = await requireAction('content:career:upload');
  // El editor no edita el catálogo (solo sube CSV) → lo llevamos a su única pestaña.
  if (!can(user.role, 'content:career:write')) redirect('/content/careers/uploads');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Test Vocacional — Carreras</h1>
        <p className="text-muted-foreground">
          Catálogo de carreras para PAA: código RIASEC, universidades vía cortes de admisión y
          datos de mercado laboral (OLaP).
        </p>
      </div>
      <CareersNav role={user.role} isGlobalScope={user.isGlobalScope} />
      <CareersTable />
    </div>
  );
}
