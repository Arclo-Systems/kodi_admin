import { hasRawHtmlOutsideSvg, RAW_HTML_MESSAGE } from '@/lib/raw-html';
import { hasSvgWithExternalResources, UNSAFE_SVG_MESSAGE } from '@/lib/svg-safety';
import type { CsvRow } from './svg-augment';

function contentError(r: CsvRow): string | null {
  const fields = [r.text, r.explanation, ...r.options.map((o) => o.text)];
  if (fields.some((f) => hasRawHtmlOutsideSvg(f))) return RAW_HTML_MESSAGE;
  if (hasSvgWithExternalResources(...fields)) return UNSAFE_SVG_MESSAGE;
  return null;
}

// Mismo corte que el formulario, aplicado a la previsualización del CSV: la fila queda listada
// entre las inválidas con su motivo en vez de entrar al banco y verse distinta en la app.
export function rejectInvalidContent(rows: CsvRow[]): CsvRow[] {
  return rows.map((r) => {
    if (!r.valid) return r;
    const error = contentError(r);
    return error ? { ...r, valid: false, error } : r;
  });
}
