import { extractSvgBlocks } from '@/lib/svg-optimize';

// Guardarraíl del XML de autor que llega en un fence ```svg. En el panel es defensa en profundidad
// (el render es un `<img data:image/svg+xml>` inerte, ver `svg-figure.tsx`), pero en la app el mismo
// XML instancia primitivas de react-native-svg y `<image href>` / `<feImage href>` disparan una
// petición desde el dispositivo del estudiante. Los vectores se mantienen en paridad con
// `frontend/src/components/questions/rich/isSafeSvg.ts` para que el panel no apruebe una figura que
// la app va a rechazar. No es un validador de XML: no "completarlo" con más regex creyendo que sí.

// Cualquier referencia que salga del documento. `data:` también: no queremos payloads embebidos
// hasta que haya una razón de producto. Un `href="#id"` interno sigue siendo válido.
const EXTERNAL_RESOURCE =
  /<image[\s>]|<feImage[\s>]|(?:xlink:)?href\s*=\s*["']\s*(?:https?:|\/\/|data:)/i;

export const UNSAFE_SVG_MESSAGE = 'El SVG no puede cargar imágenes externas ni datos embebidos';

function hasExternalResources(svg: string): boolean {
  return EXTERNAL_RESOURCE.test(svg);
}

export function isSafeSvg(src: string): boolean {
  if (/<script[\s>]/i.test(src)) return false;
  if (/<foreignObject[\s>]/i.test(src)) return false;
  if (hasExternalResources(src)) return false;
  if (/\son\w+\s*=/i.test(src)) return false;
  if (/javascript:/i.test(src)) return false;
  return true;
}

// Gate reusable (form + import CSV): true si algún campo trae una figura con recursos externos.
export function hasSvgWithExternalResources(...fields: string[]): boolean {
  return fields.some((f) => extractSvgBlocks(f).some(hasExternalResources));
}
