import { requireAction } from '@/lib/guard';
import { CutoffsDetail } from '../cutoffs-detail';

export const metadata = { title: 'Revisión de cortes' };

export default async function CutoffsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAction('content:cutoffs:upload');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Revisión de cortes</h1>
        <p className="text-muted-foreground">Diff de la subida. La aprobación es solo de admin.</p>
      </div>
      <CutoffsDetail id={id} role={user.role} />
    </div>
  );
}
