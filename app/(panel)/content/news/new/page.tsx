import { requireAction } from '@/lib/guard';
import { NewsForm } from '../news-form';

export const metadata = { title: 'Nueva noticia' };

export default async function NewNewsPage() {
  await requireAction('content:news:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva noticia</h1>
        <p className="text-muted-foreground">Entra como borrador hasta publicarla o programarla.</p>
      </div>
      <NewsForm mode="create" />
    </div>
  );
}
