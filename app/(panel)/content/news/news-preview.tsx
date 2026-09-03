'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { NewsMarkdownView } from './markdown-view';

// Espejo de la card de la app. NO lleva insignia de módulo: la app filtra la
// lista por el módulo activo, así que todas las noticias que el estudiante ve
// son de su módulo y etiquetarlas repetiría el mismo dato en cada fila. Un
// preview que muestre algo que la app no dibuja vuelve a mentir.
export function NewsPreview({
  title,
  summary,
  body,
  imageUrl,
}: {
  title: string;
  summary: string;
  body: string;
  imageUrl: string | null;
}) {
  // AUD-L6-PERF-1: el markdown solo se re-parsea cuando cambia el cuerpo, no al tipear el título.
  const renderedBody = useMemo(
    () =>
      body ? (
        <NewsMarkdownView value={body} />
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
        </div>
        <div className="space-y-2 p-4">
          {/* La app corta el titular a 3 líneas como máximo (detalle); el mock
              refleja ese truncado en vez de estirarse. */}
          <div className="line-clamp-3 text-lg font-semibold leading-tight">
            {title || <span className="text-muted-foreground">Sin título</span>}
          </div>
          <p className="text-muted-foreground text-sm">{summary || 'El resumen aparecerá acá.'}</p>
          <div className="pt-2">{renderedBody}</div>
        </div>
      </div>
    </section>
  );
}
