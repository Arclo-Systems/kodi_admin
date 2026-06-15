import { describe, it, expect } from 'vitest';
import {
  svgByteLength,
  formatBytes,
  svgWeight,
  extractSvgBlocks,
  maxSvgWeight,
  hasHeavySvg,
  stripSvgForList,
  optimizeSvg,
  optimizeSvgBlocks,
} from './svg-optimize';

const SMALL = '<svg xmlns="http://www.w3.org/2000/svg"><!-- c --><rect x="0" y="0" width="10" height="10"/></svg>';
const md = (svg: string) => `texto\n\n\`\`\`svg\n${svg}\n\`\`\`\n\nmás`;
// SVG con coords únicas para que SVGO no pueda colapsarlo bajo 30 KB.
const HEAVY = `<svg xmlns="http://www.w3.org/2000/svg">${Array.from(
  { length: 1200 },
  (_, i) => `<rect x="${i}" y="${i * 2}" width="3" height="7"/>`,
).join('')}</svg>`;

describe('svgWeight', () => {
  it('clasifica por umbral', () => {
    expect(svgWeight(5_000).level).toBe('ok');
    expect(svgWeight(20_000).level).toBe('warn');
    expect(svgWeight(40_000).level).toBe('heavy');
  });
  it('borde inclusivo: 10240=ok, 30720=warn', () => {
    expect(svgWeight(10_240).level).toBe('ok');
    expect(svgWeight(30_720).level).toBe('warn');
    expect(svgWeight(30_721).level).toBe('heavy');
  });
});

describe('formatBytes', () => {
  it('B y KB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
});

describe('extractSvgBlocks / maxSvgWeight', () => {
  it('extrae el SVG del fence', () => {
    expect(extractSvgBlocks(md(SMALL))).toEqual([SMALL]);
  });
  it('maxSvgWeight null sin SVG', () => {
    expect(maxSvgWeight('sin figura')).toBeNull();
  });
  it('maxSvgWeight devuelve bytes y nivel', () => {
    const w = maxSvgWeight(md(SMALL));
    expect(w?.bytes).toBe(svgByteLength(SMALL));
    expect(w?.level).toBe('ok');
  });
});

describe('hasHeavySvg', () => {
  it('true si algún campo tiene un SVG > 30 KB', () => {
    expect(hasHeavySvg(md(SMALL), '')).toBe(false);
    expect(hasHeavySvg('texto', md(HEAVY))).toBe(true);
  });
  it('false sin SVG', () => {
    expect(hasHeavySvg('a', 'b')).toBe(false);
  });
});

describe('stripSvgForList', () => {
  it('reemplaza el fence por chip', () => {
    expect(stripSvgForList(md(SMALL))).toContain('🖼 figura');
    expect(stripSvgForList(md(SMALL))).not.toContain('<svg');
  });
});

describe('optimizeSvg', () => {
  it('reduce el peso y reporta before/after/ratio', async () => {
    const r = await optimizeSvg(SMALL);
    expect(r.after).toBeLessThan(r.before);
    expect(r.before).toBe(svgByteLength(SMALL));
    expect(r.ratio).toBeGreaterThan(0);
    expect(r.data).not.toContain('<!--');
  });
  it('lanza con SVG malformado', async () => {
    await expect(optimizeSvg('<svg><rect')).rejects.toBeDefined();
  });
});

describe('optimizeSvgBlocks', () => {
  it('optimiza el bloque dentro del markdown', async () => {
    const { md: out, results } = await optimizeSvgBlocks(md(SMALL));
    expect(results).toHaveLength(1);
    expect(out).toContain('```svg');
    expect(out).not.toContain('<!--');
  });
  it('no-op sin SVG', async () => {
    const { md: out, results } = await optimizeSvgBlocks('texto plano');
    expect(out).toBe('texto plano');
    expect(results).toHaveLength(0);
  });
  it('no se desalinea con un fence vacío antes de uno con contenido', async () => {
    const input = `\`\`\`svg\n\n\`\`\`\n\n${md(SMALL)}`;
    const { md: out, results } = await optimizeSvgBlocks(input);
    // el bloque vacío se deja intacto; solo se optimiza el que tiene contenido
    expect(results).toHaveLength(1);
    expect(out).toContain('```svg\n\n```');
    expect(out).not.toContain('<!--');
  });
});
