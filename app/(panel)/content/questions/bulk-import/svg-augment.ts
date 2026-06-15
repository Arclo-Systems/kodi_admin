import { extractSvgBlocks, maxSvgWeight, optimizeSvgBlocks } from '@/lib/svg-optimize';

export type CsvRow = {
  row: number;
  valid: boolean;
  error?: string;
  subjectId: string;
  topicId: string;
  text: string;
  options: { id: string; text: string }[];
  correct: string;
  difficulty: string;
  explanation: string;
};

const HEADER =
  'subjectId,topicId,text,optionA,optionB,optionC,optionD,correct,difficulty,explanation';
const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function rowHasSvg(r: Pick<CsvRow, 'text' | 'explanation'>): boolean {
  return extractSvgBlocks(r.text).length > 0 || extractSvgBlocks(r.explanation).length > 0;
}

// Optimiza los SVG de text/explanation y reclasifica como inválida la fila que siga >30KB.
// Un SVG malformado hace que `optimizeSvgBlocks` lance → se captura y la fila se marca inválida
// (NO se propaga: si no, un solo SVG roto tiraría todo el preview vía Promise.all).
export async function augmentRowsWithSvg(rows: CsvRow[]): Promise<CsvRow[]> {
  return Promise.all(
    rows.map(async (r) => {
      if (!rowHasSvg(r)) return r;
      try {
        const text = (await optimizeSvgBlocks(r.text)).md;
        const explanation = (await optimizeSvgBlocks(r.explanation)).md;
        const heavy =
          maxSvgWeight(text)?.level === 'heavy' || maxSvgWeight(explanation)?.level === 'heavy';
        if (r.valid && heavy) {
          return { ...r, text, explanation, valid: false, error: 'Figura supera 30 KB tras optimizar' };
        }
        return { ...r, text, explanation };
      } catch {
        return r.valid ? { ...r, valid: false, error: 'Figura SVG inválida' } : r;
      }
    }),
  );
}

// Reconstruye un CSV canónico (header + filas) con quoting estándar. El backend lo re-parsea
// (csv-parse, columns:true) y numera las filas de datos desde 1 → selectedRows = [1..N].
// Nota: el preview del backend entrega `correct` en minúscula → acá se re-mayúscula a A-D.
// Solo preserva las 10 columnas soportadas (descarta columnas extra del CSV original); es
// aceptable porque el backend solo consume esas.
export function buildQuestionsCsv(rows: CsvRow[]): string {
  const lines = rows.map((r) =>
    [
      r.subjectId,
      r.topicId,
      r.text,
      r.options[0]?.text ?? '',
      r.options[1]?.text ?? '',
      r.options[2]?.text ?? '',
      r.options[3]?.text ?? '',
      r.correct.toUpperCase(),
      r.difficulty,
      r.explanation,
    ]
      .map(cell)
      .join(','),
  );
  return `${HEADER}\n${lines.join('\n')}\n`;
}
