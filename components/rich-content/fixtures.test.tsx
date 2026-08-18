import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import fixturesContract from './__contracts__/rich-content-fixtures.json';
import richToolsContract from './__contracts__/rich-tools.json';
import { extractSvgBlocks, svgByteLength } from '@/lib/svg-optimize';
import { hasRawHtmlOutsideSvg } from '@/lib/raw-html';
import { isSafeSvg } from '@/lib/svg-safety';
import { RichContent } from './rich-content';
import type { RichTool } from './markdown-field';

// Contrato compartido panel ↔ app: las mismas fixtures que la app parte en bloques
// (`frontend/src/components/questions/rich/fixtures.test.ts`) se snapshotean acá. El canónico vive en
// `docs/contracts/` —afuera de los dos repos— y `__contracts__/` es la copia vendorizada que se
// commitea para que el test corra en CI sin `docs/`: se edita el canónico y se corre
// `contracts:sync`; `contracts:check` (parte de `npm run ci`) avisa si la copia quedó vieja.
//
// Agregar una `RichTool` obliga a agregar su fixture: el test de cobertura de abajo falla, y el de
// la app sigue fallando hasta que el renderer móvil la soporte.

type FixtureTool = RichTool | 'markdown' | 'html' | 'edge';

interface RichFixture {
  id: string;
  tool: FixtureTool;
  markdown: string;
  /** Fixtures de peso: el test infla `{{PAD}}` en vez de meter 100 KB en el JSON. */
  generateBytes?: number;
  expects: {
    blocks: string[];
    rawHtml: boolean;
    safeSvg?: boolean;
    notes?: string;
  };
}

const fixtures = fixturesContract as RichFixture[];
const richTools: string[] = richToolsContract;

const PAD_TOKEN = '{{PAD}}';
const SVG_FENCE_BODY = /```svg\r?\n([\s\S]*?)\r?\n```/;

// `Mermaid` renderiza async y con debounce de 250 ms: el snapshot capturaría un div vacío y el
// timer se dispararía fuera del test. El stub fija lo que el contrato prueba acá — que el fence
// enruta al componente de diagrama con su fuente intacta.
vi.mock('./mermaid', () => ({
  Mermaid: ({ chart }: { chart: string }) => <pre data-mermaid>{chart}</pre>,
}));

// Toda tool del editor tiene que estar en el contrato: agregar una acá sin agregarla al JSON
// (y sin fixture) rompe el test. El Record es la mitad de tipos — no compila si falta una tool.
const EDITOR_TOOLS: Record<RichTool, true> = {
  formula: true,
  table: true,
  image: true,
  mermaid: true,
  svg: true,
};

function padding(length: number): string {
  return 'M0 0 '.repeat(Math.ceil(length / 5)).slice(0, length);
}

/** El markdown de la fixture, con el relleno de peso ya expandido. */
function markdownOf(fixture: RichFixture): string {
  if (fixture.generateBytes === undefined) return fixture.markdown;
  const body = SVG_FENCE_BODY.exec(fixture.markdown)?.[1] ?? '';
  const bare = body.replace(PAD_TOKEN, '');
  return fixture.markdown.replace(PAD_TOKEN, padding(fixture.generateBytes - bare.length));
}

function svgOf(fixture: RichFixture): string {
  return extractSvgBlocks(markdownOf(fixture))[0] ?? '';
}

describe('contrato de contenido rico', () => {
  it.each(fixtures)('$id: el gate de HTML crudo coincide con el contrato', (fixture) => {
    expect(hasRawHtmlOutsideSvg(markdownOf(fixture))).toBe(fixture.expects.rawHtml);
  });

  const withSvgVerdict = fixtures.filter((f) => f.expects.safeSvg !== undefined);

  it.each(withSvgVerdict)('$id: el veredicto de SVG coincide con la app', (fixture) => {
    const svg = svgOf(fixture);
    expect(svg).not.toBe('');
    expect(isSafeSvg(svg)).toBe(fixture.expects.safeSvg);
  });

  const generated = fixtures.filter((f) => f.generateBytes !== undefined);

  it.each(generated)('$id: el relleno expande al peso declarado', (fixture) => {
    expect(svgByteLength(svgOf(fixture))).toBe(fixture.generateBytes);
  });

  // Las fixtures de peso quedan fuera del snapshot: 100 KB de data-URI por caso no prueban nada
  // que el veredicto de arriba no cubra.
  const snapshotable = fixtures.filter((f) => f.generateBytes === undefined);

  it.each(snapshotable)('$id: el preview del panel no cambia', ({ markdown }) => {
    const { container } = render(<RichContent value={markdown} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('el tipo RichTool cubre exactamente las tools del contrato', () => {
    expect(Object.keys(EDITOR_TOOLS).sort()).toEqual([...richTools].sort());
  });

  it.each(richTools)('la RichTool "%s" tiene al menos una fixture', (tool) => {
    expect(fixtures.filter((f) => f.tool === tool).length).toBeGreaterThan(0);
  });
});
