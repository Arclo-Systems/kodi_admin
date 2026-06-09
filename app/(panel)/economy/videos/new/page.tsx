import { requireAction } from '@/lib/guard';
import { VideoForm } from '../video-form';

export const metadata = { title: 'Nuevo video' };

export default async function NewVideoPage() {
  await requireAction('economy:video:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo video</h1>
        <p className="text-muted-foreground">Sponsor, país, contexto, archivo de video y vigencia.</p>
      </div>
      <VideoForm />
    </div>
  );
}
