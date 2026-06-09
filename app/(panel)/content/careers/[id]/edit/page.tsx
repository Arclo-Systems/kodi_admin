import { requireAction } from '@/lib/guard';
import { CareerForm } from '../../career-form';

export const metadata = { title: 'Editar carrera' };

export default async function EditCareerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('content:career:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar carrera</h1>
        <p className="text-muted-foreground">Modificá datos de interés, mercado y estado.</p>
      </div>
      <CareerForm careerId={id} />
    </div>
  );
}
