import { requireAction } from '@/lib/guard';
import { VideoForm } from '../../video-form';

export const metadata = { title: 'Editar video' };

export default async function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('economy:video:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar video</h1>
        <p className="text-muted-foreground">Actualizá clasificación, archivo, peso y vigencia.</p>
      </div>
      <VideoForm videoId={id} />
    </div>
  );
}
