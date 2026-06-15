import { describe, it, expect } from 'vitest';
import { augmentRowsWithSvg, buildQuestionsCsv, type CsvRow } from './svg-augment';

const baseRow = (over: Partial<CsvRow>): CsvRow => ({
  row: 1,
  valid: true,
  subjectId: 'S1',
  topicId: 'T1',
  text: '¿Cuánto?',
  options: [
    { id: 'a', text: '1' },
    { id: 'b', text: '2' },
    { id: 'c', text: '3' },
    { id: 'd', text: '4' },
  ],
  correct: 'b',
  difficulty: 'medium',
  explanation: '',
  ...over,
});

// Coords únicas → SVGO no puede colapsarlo; garantiza >30 KB tras optimizar.
const heavySvg = `<svg xmlns="http://www.w3.org/2000/svg">${Array.from(
  { length: 1200 },
  (_, i) => `<rect x="${i}" y="${i * 2}" width="3" height="7"/>`,
).join('')}</svg>`;
const smallSvg = '<svg xmlns="http://www.w3.org/2000/svg"><!-- x --><rect width="5" height="5"/></svg>';
// SVG real: multilínea (con \n internos).
const multilineSvg = '<svg xmlns="http://www.w3.org/2000/svg">\n  <rect width="5" height="5"/>\n</svg>';
const fence = (s: string) => `\`\`\`svg\n${s}\n\`\`\``;

describe('buildQuestionsCsv', () => {
  it('serializa header + fila con quoting y correct en mayúscula', () => {
    const csv = buildQuestionsCsv([baseRow({ text: 'a "b"' })]);
    const [header, line] = csv.trim().split('\n');
    expect(header).toBe(
      'subjectId,topicId,text,optionA,optionB,optionC,optionD,correct,difficulty,explanation',
    );
    expect(line).toContain('"a ""b"""');
    expect(line).toContain(',"B",'); // correct B
  });

  it('preserva saltos de línea internos (SVG multilínea) en una sola celda quoteada', () => {
    const csv = buildQuestionsCsv([baseRow({ text: `Q ${fence(multilineSvg)}` })]);
    // el contenido va entre comillas y conserva los \n internos; las comillas internas se
    // escapan duplicándolas ("") según el quoting CSV estándar
    expect(csv).toContain('"Q ```svg');
    expect(csv).toContain('\n  <rect width=""5"" height=""5""/>\n');
    // header en su propia línea; el resto es la celda multilínea quoteada
    expect(csv.startsWith('subjectId,topicId,text,')).toBe(true);
  });
});

describe('augmentRowsWithSvg', () => {
  it('optimiza el SVG pequeño y mantiene la fila válida', async () => {
    const [out] = await augmentRowsWithSvg([baseRow({ text: `Q ${fence(smallSvg)}` })]);
    expect(out.valid).toBe(true);
    expect(out.text).not.toContain('<!--');
  });

  it('marca inválida la fila cuyo SVG sigue heavy tras optimizar', async () => {
    const [out] = await augmentRowsWithSvg([baseRow({ explanation: fence(heavySvg) })]);
    expect(out.valid).toBe(false);
    expect(out.error).toMatch(/30 KB/);
  });

  it('marca inválida (sin romper) la fila con SVG malformado', async () => {
    const [out] = await augmentRowsWithSvg([baseRow({ text: `Q ${fence('<svg><rect')}` })]);
    expect(out.valid).toBe(false);
    expect(out.error).toMatch(/inválida/i);
  });

  it('deja intactas las filas sin SVG', async () => {
    const row = baseRow({});
    const [out] = await augmentRowsWithSvg([row]);
    expect(out).toEqual(row);
  });
});
