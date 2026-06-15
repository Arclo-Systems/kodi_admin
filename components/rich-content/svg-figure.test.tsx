import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SvgFigure } from './svg-figure';

const VALID = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>Plano</title><rect width="10" height="10"/></svg>';

describe('SvgFigure', () => {
  it('renderiza un <img> data-URI con alt del <title> (invariante de seguridad)', () => {
    const { container } = render(<SvgFigure source={VALID} />);
    const img = screen.getByRole('img', { name: 'Plano' });
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
    // Invariante: la inercia depende de que sea un <img>. Si alguien cambia a object/iframe/inline,
    // este assert falla y obliga a re-evaluar la seguridad.
    expect(container.querySelector('img')).not.toBeNull();
    expect(container.querySelector('iframe, object, embed')).toBeNull();
  });

  it('alt genérico sin <title>', () => {
    render(<SvgFigure source='<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>' />);
    expect(screen.getByRole('img', { name: 'Figura' })).toBeInTheDocument();
  });

  it('fallback con <script>', () => {
    render(<SvgFigure source='<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' />);
    expect(screen.getByText('Figura inválida o insegura.')).toBeInTheDocument();
  });

  it('fallback con handler on*', () => {
    render(<SvgFigure source='<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><rect/></svg>' />);
    expect(screen.getByText('Figura inválida o insegura.')).toBeInTheDocument();
  });

  it('fallback si la raíz no es svg', () => {
    render(<SvgFigure source='<div>no</div>' />);
    expect(screen.getByText('Figura inválida o insegura.')).toBeInTheDocument();
  });

  it('fallback con SVG malformado', () => {
    render(<SvgFigure source='<svg xmlns="http://www.w3.org/2000/svg"><rect' />);
    expect(screen.getByText('Figura inválida o insegura.')).toBeInTheDocument();
  });

  it('fallback si supera 100 KB', () => {
    const huge = `<svg xmlns="http://www.w3.org/2000/svg">${'<rect width="1" height="1"/>'.repeat(4000)}</svg>`;
    render(<SvgFigure source={huge} />);
    expect(screen.getByText('Figura inválida o insegura.')).toBeInTheDocument();
  });
});
