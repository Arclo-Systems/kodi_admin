import { requireAction } from '@/lib/guard';
import { VideosTable } from './videos-table';

export const metadata = { title: 'Videos' };

export default async function VideosPage() {
  await requireAction('economy:video:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Videos</h1>
        <p className="text-muted-foreground">
          Catálogo de videos patrocinados por país y contexto (práctica, modos de juego, Kokos). La app
          los sirve con rotación ponderada por peso; acá se gestionan.
        </p>
      </div>
      <VideosTable />
    </div>
  );
}
