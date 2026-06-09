import { requireAction } from '@/lib/guard';
import { NewsTable } from './news-table';

export const metadata = { title: 'Noticias' };

export default async function NewsPage() {
  await requireAction('content:news:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Noticias</h1>
        <p className="text-muted-foreground">Artículos por país y módulo, con workflow de publicación.</p>
      </div>
      <NewsTable />
    </div>
  );
}
