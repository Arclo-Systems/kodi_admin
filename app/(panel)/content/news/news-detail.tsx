'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useNewsArticle } from '@/hooks/use-news';
import { NewsActions } from './news-actions';
import { NewsForm } from './news-form';

export function NewsDetail({ id }: { id: string }) {
  const { data, isLoading } = useNewsArticle(id);

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (!data) return <p className="text-muted-foreground">No se encontró la noticia.</p>;

  return (
    <div className="space-y-6">
      <NewsActions article={data} />
      <NewsForm mode="edit" initial={data} />
    </div>
  );
}
