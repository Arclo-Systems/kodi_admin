import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { NewsMarkdownView } from './markdown-view';

// El cuerpo de una noticia lo dibuja la app con `MarkdownBlock`: Markdown GFM y
// nada más — sin KaTeX, sin Mermaid, sin SVG. Estos casos fijan que el preview
// del panel dibuje exactamente eso y ni un bloque más.
describe('NewsMarkdownView — paridad con lo que la app dibuja', () => {
  it('dibuja tablas GFM (la app las dibuja, el preview pelado no las dibujaba)', () => {
    render(
      <NewsMarkdownView value={'| Materia | Fecha |\n| --- | --- |\n| Mate | 3/4 |'} />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Materia' })).toBeInTheDocument();
  });

  // Un SVG con recursos externos no puede convertirse en figura acá: el gate de
  // guardado exime los fences ```svg, así que si el preview los dibujara sería
  // la única punta capaz de pedirle un recurso a un tercero.
  it('un fence svg queda como código, no como figura', () => {
    const { container } = render(
      <NewsMarkdownView
        value={
          '```svg\n<svg xmlns="http://www.w3.org/2000/svg"><image href="https://ajeno.test/x.png"/></svg>\n```'
        }
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('code')).not.toBeNull();
  });

  it('un fence mermaid queda como código, no como diagrama', () => {
    const { container } = render(
      <NewsMarkdownView value={'```mermaid\ngraph TD\n  A --> B\n```'} />,
    );
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('code')?.textContent).toContain('graph TD');
  });

  // La app imprime `$x$` tal cual; una isla KaTeX acá prometería algo que allá
  // no pasa.
  it('la matemática se muestra literal, sin isla KaTeX', () => {
    const { container } = render(<NewsMarkdownView value={'¿Cuánto vale $x$?'} />);
    expect(container.querySelector('.katex')).toBeNull();
    expect(container.textContent).toContain('$x$');
  });

  // Defensa en profundidad: el guardado ya rechaza HTML crudo, pero si una
  // noticia vieja lo tuviera, el renderer no puede ejecutarlo.
  it('no ejecuta HTML crudo de una noticia vieja', () => {
    const { container } = render(
      <NewsMarkdownView value={'Hola <script>alert(1)</script> y <b>negrita</b>'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('un markdown sin cerrar no rompe el render', () => {
    const { container } = render(
      <NewsMarkdownView value={'Un **título a medias y un [link sin cerrar'} />,
    );
    expect(container.textContent).toContain('título a medias');
  });
});
