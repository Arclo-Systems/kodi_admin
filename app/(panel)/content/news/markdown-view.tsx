'use client';

import { RichContent } from '@/components/rich-content/rich-content';

/**
 * Cuerpo de una noticia, dibujado como lo dibuja la app.
 *
 * Antes era un `ReactMarkdown` pelado: sin `remark-gfm` y sin `rehype-sanitize`.
 * Eso desalineaba el preview en las dos direcciones — una tabla GFM se veía como
 * texto suelto en el panel y salía como tabla en la app, y el saneo de URLs
 * dependía de los defaults en vez del schema compartido.
 *
 * Va contra el renderer compartido con las tres islas apagadas, porque la app
 * pinta el cuerpo de la noticia con `MarkdownBlock` y no con `RichContent`
 * (decisión de `frontend/src/components/news/ArticleBody.tsx`: sin fórmulas ni
 * diagramas no hay isla WebView que pagar). Prender acá lo que allá no se dibuja
 * sería un preview que promete de más.
 */
export function NewsMarkdownView({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <RichContent
      value={value}
      className={className}
      allowMath={false}
      allowMermaid={false}
      allowSvg={false}
    />
  );
}
