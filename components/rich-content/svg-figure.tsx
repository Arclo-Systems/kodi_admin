'use client';

import { useMemo } from 'react';
import { svgByteLength } from '@/lib/svg-optimize';

const MAX_BYTES = 100 * 1024;

// Filtro de UX / defensa en profundidad — NO es la frontera de seguridad. La inercia la da el
// render por `<img src="data:...">` (abajo). No "completar" este regex pretendiendo que valide
// HTML/XML: para eso está el `<img>`.
function isSafeSvg(src: string): boolean {
  if (/<script[\s>]/i.test(src)) return false;
  if (/<foreignObject[\s>]/i.test(src)) return false;
  if (/\son\w+\s*=/i.test(src)) return false;
  if (/javascript:/i.test(src)) return false;
  return true;
}

type Parsed = { ok: true; alt: string } | { ok: false };

function parseSvg(src: string): Parsed {
  if (src.length === 0 || svgByteLength(src) > MAX_BYTES) return { ok: false };
  if (!isSafeSvg(src)) return { ok: false };
  const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return { ok: false };
  if (doc.documentElement.tagName.toLowerCase() !== 'svg') return { ok: false };
  const title = doc.querySelector('title')?.textContent?.trim();
  return { ok: true, alt: title && title.length > 0 ? title : 'Figura' };
}

// Render seguro de un SVG pegado por el autor: se sirve como data-URI vía <img>, que el navegador
// trata como imagen INERTE (no ejecuta script/onload ni resuelve refs externas). La validación
// (script/handlers/parseo/tamaño) es defensa en profundidad; ante cualquier fallo, fallback.
// INVARIANTE DE SEGURIDAD: no cambiar este render a object/iframe/inline/dangerouslySetInnerHTML
// sin sanitizar con DOMPurify — un test en svg-figure.test.tsx falla si deja de ser <img>.
export function SvgFigure({ source }: { source: string }) {
  const parsed = useMemo(() => parseSvg(source), [source]);
  if (!parsed.ok) {
    return <span className="text-destructive text-sm">Figura inválida o insegura.</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data-URI SVG inline; next/image no aplica
    <img
      src={`data:image/svg+xml,${encodeURIComponent(source)}`}
      alt={parsed.alt}
      className="my-2 max-w-full rounded-md"
    />
  );
}
