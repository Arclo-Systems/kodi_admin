import { requireAction } from '@/lib/guard';
import { NewsDetail } from '../news-detail';

export const metadata = { title: 'Editar noticia' };

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('content:news:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar noticia</h1>
        <p className="text-muted-foreground">Edita el contenido y maneja la publicación.</p>
      </div>
      <NewsDetail id={id} />
    </div>
  );
}
