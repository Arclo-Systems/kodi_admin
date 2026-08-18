import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import fixturesContract from '../../../docs/contracts/rich-content-fixtures.json';
import richToolsContract from '../../../docs/contracts/rich-tools.json';
import { extractSvgBlocks } from '@/lib/svg-optimize';
import { hasRawHtmlOutsideSvg } from '@/lib/raw-html';
import { isSafeSvg } from '@/lib/svg-safety';
import { RichContent } from './rich-content';
import type { RichTool } from './markdown-field';

// Contrato compartido panel ↔ app: las mismas fixtures que la app parte en bloques
// (`frontend/src/components/questions/rich/fixtures.test.ts`) se snapshotean acá. El archivo vive
// en `docs/contracts/` —afuera de los dos repos— para que ninguna punta lo mueva para su lado.
// Agregar una `RichTool` obliga a agregar su fixture: el test de cobertura de abajo falla, y el de
// la app sigue fallando hasta que el renderer móvil la soporte.

interface RichFixture {
  id: string;
  tool: string;
  markdown: string;
  expects: {
    blocks: string[];
    rawHtml: boolean;
    safeSvg?: boolean;
    notes?: string;
  };
}

const fixtures = fixturesContract as RichFixture[];
const richTools: string[] = richToolsContract;

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

describe('contrato de contenido rico', () => {
  it.each(fixtures)('$id: el gate de HTML crudo coincide con el contrato', ({ markdown, expects }) => {
    expect(hasRawHtmlOutsideSvg(markdown)).toBe(expects.rawHtml);
  });

  const withSvgVerdict = fixtures.filter((f) => f.expects.safeSvg !== undefined);

  it.each(withSvgVerdict)('$id: el guardarraíl de SVG coincide con la app', ({ markdown, expects }) => {
    const [svg] = extractSvgBlocks(markdown);
    expect(svg).toBeDefined();
    expect(isSafeSvg(svg ?? '')).toBe(expects.safeSvg);
  });

  it.each(fixtures)('$id: el preview del panel no cambia', ({ markdown }) => {
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
