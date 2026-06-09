'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MarkdownView } from './markdown-view';
import type { NewsCategory } from '@/hooks/use-news';

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  module: 'Módulo',
  education: 'Educación',
};

export function NewsPreview({
  category,
  title,
  summary,
  body,
  imageUrl,
}: {
  category: NewsCategory;
  title: string;
  summary: string;
  body: string;
  imageUrl: string | null;
}) {
  // AUD-L6-PERF-1: el markdown solo se re-parsea cuando cambia el cuerpo, no al tipear el título.
  const renderedBody = useMemo(
    () =>
      body ? (
        <MarkdownView value={body} />
      ) : (
        <p className="text-muted-foreground text-sm">El cuerpo aparecerá acá.</p>
      ),
    [body],
  );

  return (
    // AUD-L6-A11Y-1: mock visual, sin headings que compitan con el <h1> de la página.
    <section aria-label="Vista previa del artículo">
      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted relative aspect-video">
          {imageUrl ? (
            <Image src={imageUrl} alt={title || 'Portada'} fill className="object-cover" unoptimized />
          ) : (
            <div className="text-muted-foreground grid h-full place-items-center">
              <ImageIcon className="size-8" />
            </div>
          )}
          <Badge className="absolute top-2 left-2">{CATEGORY_LABELS[category]}</Badge>
        </div>
        <div className="space-y-2 p-4">
          <div className="text-lg font-semibold leading-tight">
            {title || <span className="text-muted-foreground">Sin título</span>}
          </div>
          <p className="text-muted-foreground text-sm">{summary || 'El resumen aparecerá acá.'}</p>
          <div className="pt-2">{renderedBody}</div>
        </div>
      </div>
    </section>
  );
}
