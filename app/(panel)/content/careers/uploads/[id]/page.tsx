import { requireAction } from '@/lib/guard';
import { CareerUploadDetail } from './career-upload-detail';

export const metadata = { title: 'Revisión de subida de carreras' };

export default async function CareerUploadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAction('content:career:upload');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Revisión de subida</h1>
        <p className="text-muted-foreground">
          Diff de la subida (upsert por nombre). La aprobación es solo de admin.
        </p>
      </div>
      <CareerUploadDetail id={id} role={user.role} />
    </div>
  );
}
