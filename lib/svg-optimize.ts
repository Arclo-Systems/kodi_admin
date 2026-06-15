export const SVG_WEIGHT_WARN = 10_240; // 10 KB
export const SVG_WEIGHT_MAX = 30_720; // 30 KB

export type SvgWeightLevel = 'ok' | 'warn' | 'heavy';

const SVG_FENCE = /```svg\s*\n([\s\S]*?)```/g;

export function svgByteLength(svg: string): number {
  return new TextEncoder().encode(svg).length;
}

export function formatBytes(n: number): string {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}

export function svgWeight(bytes: number): { level: SvgWeightLevel; label: string } {
  const level: SvgWeightLevel =
    bytes > SVG_WEIGHT_MAX ? 'heavy' : bytes > SVG_WEIGHT_WARN ? 'warn' : 'ok';
  return { level, label: formatBytes(bytes) };
}

export function extractSvgBlocks(md: string): string[] {
  const out: string[] = [];
  for (const m of md.matchAll(SVG_FENCE)) {
    const body = m[1]?.trim();
    if (body) out.push(body);
  }
  return out;
}

export function maxSvgWeight(md: string): { bytes: number; level: SvgWeightLevel } | null {
  const blocks = extractSvgBlocks(md);
  if (blocks.length === 0) return null;
  const bytes = Math.max(...blocks.map(svgByteLength));
  return { bytes, level: svgWeight(bytes).level };
}

// Gate de peso reusable (form): true si algún campo tiene un SVG en nivel heavy (>30 KB).
export function hasHeavySvg(...fields: string[]): boolean {
  return fields.some((f) => maxSvgWeight(f)?.level === 'heavy');
}

export function stripSvgForList(md: string): string {
  return md.replace(SVG_FENCE, '🖼 figura ');
}

export type OptimizeResult = { data: string; before: number; after: number; ratio: number };

export async function optimizeSvg(source: string): Promise<OptimizeResult> {
  const { optimize } = await import('svgo/browser');
  const before = svgByteLength(source);
  const { data } = optimize(source, {
    multipass: true,
    plugins: [{ name: 'preset-default' }, 'removeScriptElement'],
  });
  const after = svgByteLength(data);
  const ratio = before > 0 ? Math.round((1 - after / before) * 100) : 0;
  return { data, before, after, ratio };
}

// Optimiza cada bloque svg NO vacío y los reemplaza preservando el resto del texto. Los bloques
// vacíos se dejan intactos (mismo criterio que `extractSvgBlocks`), evitando el desfase de índices.
// Propaga si `optimizeSvg` lanza (SVG malformado) → el llamador decide (toast / fila inválida).
export async function optimizeSvgBlocks(
  md: string,
): Promise<{ md: string; results: OptimizeResult[] }> {
  const matches = [...md.matchAll(SVG_FENCE)];
  if (matches.length === 0) return { md, results: [] };
  const results: OptimizeResult[] = [];
  let out = '';
  let last = 0;
  for (const m of matches) {
    const start = m.index ?? 0;
    const body = (m[1] ?? '').trim();
    out += md.slice(last, start);
    if (body) {
      const r = await optimizeSvg(body);
      results.push(r);
      out += `\`\`\`svg\n${r.data}\n\`\`\``;
    } else {
      out += m[0]; // bloque vacío: intacto
    }
    last = start + m[0].length;
  }
  out += md.slice(last);
  return { md: out, results };
}
