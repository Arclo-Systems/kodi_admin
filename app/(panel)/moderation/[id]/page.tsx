import { requireAction } from '@/lib/guard';
import { ReportDetail } from './report-detail';

export const metadata = { title: 'Reporte' };

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('view:moderation');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reporte</h1>
        <p className="text-muted-foreground">Detalle de la denuncia y resolución.</p>
      </div>
      <ReportDetail id={id} />
    </div>
  );
}
