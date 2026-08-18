import { describe, it, expect } from 'vitest';
import { rejectInvalidContent } from './content-guard';
import type { CsvRow } from './svg-augment';

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

describe('rejectInvalidContent', () => {
  it('marca inválida la fila con HTML crudo en el enunciado', () => {
    const [out] = rejectInvalidContent([baseRow({ text: 'Una línea<br>y otra' })]);
    expect(out?.valid).toBe(false);
    expect(out?.error).toMatch(/El HTML no se muestra en la app/);
  });

  it('marca inválida la fila con HTML crudo en una opción', () => {
    const [out] = rejectInvalidContent([
      baseRow({
        options: [
          { id: 'a', text: '<u>uno</u>' },
          { id: 'b', text: '2' },
        ],
      }),
    ]);
    expect(out?.valid).toBe(false);
  });

  it('marca inválida la fila cuyo SVG carga una imagen externa', () => {
    const svg =
      '```svg\n<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.test/p.png"/></svg>\n```';
    const [out] = rejectInvalidContent([baseRow({ explanation: svg })]);
    expect(out?.valid).toBe(false);
    expect(out?.error).toMatch(/imágenes externas/);
  });

  it('no pisa el motivo de una fila que ya venía inválida', () => {
    const row = baseRow({ text: '<br>', valid: false, error: 'Figura supera 30 KB tras optimizar' });
    const [out] = rejectInvalidContent([row]);
    expect(out).toEqual(row);
  });

  it('deja intacta la fila con Markdown y una figura sin recursos externos', () => {
    const row = baseRow({
      text: 'Área de $x^2$\n```svg\n<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5"/></svg>\n```',
    });
    expect(rejectInvalidContent([row])[0]).toEqual(row);
  });
});
