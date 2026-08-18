import { extractSvgBlocks, svgByteLength } from '@/lib/svg-optimize';

// Guardarraíl del XML de autor que llega en un fence ```svg. En el panel es defensa en profundidad
// (el render es un `<img data:image/svg+xml>` inerte, ver `svg-figure.tsx`), pero en la app el mismo
// XML instancia primitivas de react-native-svg y `<image href>` / `<feImage href>` disparan una
// petición desde el dispositivo del estudiante. Los vectores se mantienen en paridad con
// `frontend/src/components/questions/rich/isSafeSvg.ts` para que el panel no apruebe una figura que
// la app va a rechazar. No es un validador de XML: no "completarlo" con más regex creyendo que sí.

const MAX_BYTES = 100 * 1024;

// Cualquier referencia que salga del documento. `data:` también: no queremos payloads embebidos
// hasta que haya una razón de producto. Un `href="#id"` interno sigue siendo válido.
const EXTERNAL_RESOURCE =
  /<image[\s>]|<feImage[\s>]|(?:xlink:)?href\s*=\s*["']\s*(?:https?:|\/\/|data:)/i;

export const SVG_EXTERNAL_MESSAGE = 'El SVG no puede cargar imágenes externas ni datos embebidos';
export const SVG_UNSAFE_MESSAGE =
  'El SVG contiene contenido no permitido (scripts, eventos o elementos externos)';

type SvgIssue = 'external' | 'unsafe';

function svgIssue(src: string): SvgIssue | null {
  if (EXTERNAL_RESOURCE.test(src)) return 'external';
  if (src.length === 0) return 'unsafe';
  if (svgByteLength(src) > MAX_BYTES) return 'unsafe';
  if (/<script[\s>]/i.test(src)) return 'unsafe';
  if (/<foreignObject[\s>]/i.test(src)) return 'unsafe';
  if (/\son\w+\s*=/i.test(src)) return 'unsafe';
  if (/javascript:/i.test(src)) return 'unsafe';
  return null;
}

export function isSafeSvg(src: string): boolean {
  return svgIssue(src) === null;
}

// Gate reusable (form + import CSV): devuelve el motivo del primer fence ```svg que no pasa el
// filtro, o null si todos son dibujables tal cual en la app.
export function svgRejectionMessage(...fields: string[]): string | null {
  for (const field of fields) {
    for (const block of extractSvgBlocks(field)) {
      const issue = svgIssue(block);
      if (issue === 'external') return SVG_EXTERNAL_MESSAGE;
      if (issue === 'unsafe') return SVG_UNSAFE_MESSAGE;
    }
  }
  return null;
}
