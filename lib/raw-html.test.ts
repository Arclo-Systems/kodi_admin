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
    ['desigualdad sin espacios', 'Si a<b entonces b>c', false],
    ['variable menor que otra', 'Se cumple x<y en todo el dominio', false],
    ['corazón', 'Me gusta <3 esta materia', false],
    ['fence svg', `Figura:\n${svgFence}`, false],
    ['fence mermaid', `Diagrama:\n${mermaidFence}`, false],
    ['fence svg + html fuera', `${svgFence}\nY además<br>esto`, true],
    ['fence que no es nuestro (```svgx)', '```svgx\n<br>\n```', true],
    ['fence svg con \\r\\n', 'Figura:\r\n```svg\r\n<svg><rect/></svg>\r\n```', false],
    ['markdown puro', 'Texto con **negrita**, *cursiva* y $x^2$', false],
    ['vacío', '', false],
  ])('%s', (_caso, md, esperado) => {
    expect(hasRawHtmlOutsideSvg(md)).toBe(esperado);
  });
});
