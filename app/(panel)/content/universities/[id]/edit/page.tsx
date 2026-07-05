import { requireAction } from '@/lib/guard';
import { UniversityForm } from '../../university-form';

export const metadata = { title: 'Editar universidad' };

export default async function EditUniversityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAction('content:university:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar universidad</h1>
        <p className="text-muted-foreground">Modificá pesos, escala y estado.</p>
      </div>
      <UniversityForm universityId={id} />
    </div>
  );
}
