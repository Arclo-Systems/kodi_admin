import { describe, it, expect } from 'vitest';
import { hasRawHtmlOutsideSvg } from './raw-html';

const svgFence = '```svg\n<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5"/></svg>\n```';
const mermaidFence = '```mermaid\ngraph TD\n  A[Inicio] --> B[Fin]\n```';

describe('hasRawHtmlOutsideSvg', () => {
  it.each([
    ['etiqueta suelta', 'Una línea<br>y otra', true],
    ['etiqueta con cierre', 'Subrayado <u>x</u>', true],
    ['etiqueta con atributos', '<span style="color:red">rojo</span>', true],
    ['menor que con espacios', 'Si a < b entonces c > d', false],
    ['corazón', 'Me gusta <3 esta materia', false],
    ['fence svg', `Figura:\n${svgFence}`, false],
    ['fence mermaid', `Diagrama:\n${mermaidFence}`, false],
    ['fence svg + html fuera', `${svgFence}\nY además<br>esto`, true],
    ['markdown puro', 'Texto con **negrita**, *cursiva* y $x^2$', false],
    ['vacío', '', false],
  ])('%s', (_caso, md, esperado) => {
    expect(hasRawHtmlOutsideSvg(md)).toBe(esperado);
  });
});
