import { describe, it, expect } from 'vitest';
import {
  SVG_EXTERNAL_MESSAGE,
  SVG_UNSAFE_MESSAGE,
  isSafeSvg,
  svgRejectionMessage,
} from './svg-safety';

const SAFE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
const WITH_SCRIPT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script></svg>';
const WITH_IMAGE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><image href="https://x.test/a.png"/></svg>';

const fence = (lang: string, svg: string) => `Observá la figura:\n\n\`\`\`${lang}\n${svg}\n\`\`\``;

describe('isSafeSvg', () => {
  it('acepta la figura sin recursos externos ni script', () => {
    expect(isSafeSvg(SAFE)).toBe(true);
    expect(isSafeSvg(WITH_SCRIPT)).toBe(false);
  });
});

describe('svgRejectionMessage', () => {
  it('no rechaza la figura segura', () => {
    expect(svgRejectionMessage(fence('svg', SAFE), '')).toBeNull();
  });

  // El fence del autor puede venir en mayúsculas: la app lo dibuja igual
  // (`splitRichContent` baja el lenguaje a minúsculas), así que el guardado
  // tiene que verlo o el XML llega intacto al dispositivo.
  it('rechaza el script aunque el fence venga en mayúsculas', () => {
    expect(svgRejectionMessage(fence('SVG', WITH_SCRIPT))).toBe(SVG_UNSAFE_MESSAGE);
    expect(svgRejectionMessage(fence('Svg', WITH_IMAGE))).toBe(SVG_EXTERNAL_MESSAGE);
  });
});
