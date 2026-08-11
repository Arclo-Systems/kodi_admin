import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WheelPreview, type WheelPreviewSector } from './wheel-preview';

const SECTORS: WheelPreviewSector[] = [
  { id: 's1', name: 'Español', color: '#F47C6B' },
  { id: 's2', name: 'Matemática', color: '#5DB7E8' },
];

function sectorPaths(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('path[data-slot="wheel-sector"]'));
}

describe('WheelPreview', () => {
  it('dibuja un sector por categoría más el de la corona', () => {
    const { container } = render(<WheelPreview sectors={SECTORS} />);
    expect(sectorPaths(container)).toHaveLength(3);
    expect(container.querySelectorAll('path[data-slot="wheel-sector-rim"]')).toHaveLength(3);
  });

  it('recorta al tope de sectores del módulo', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      id: `s${i}`,
      name: `Materia ${i}`,
      color: '#408D99',
    }));
    const { container } = render(<WheelPreview sectors={many} cap={4} />);
    expect(sectorPaths(container)).toHaveLength(5); // 4 categorías + corona
  });

  it('el tope nunca baja de 2, igual que el backend', () => {
    const { container } = render(<WheelPreview sectors={SECTORS} cap={1} />);
    expect(sectorPaths(container)).toHaveLength(3);
  });

  it('usa el color de respaldo por posición cuando la categoría no trae color', () => {
    const { container } = render(
      <WheelPreview sectors={[{ id: 's1', name: 'Tema sin color' }]} />,
    );
    const first = sectorPaths(container)[0];
    expect(first?.getAttribute('fill')).toBe('#F47C6B');
  });

  it('dibuja el arte del sector solo cuando trae assetUrl', () => {
    const { container } = render(
      <WheelPreview
        sectors={[
          { id: 's1', name: 'Con arte', color: '#F47C6B', assetUrl: 'https://cdn/x.webp' },
          { id: 's2', name: 'Sin arte', color: '#5DB7E8' },
        ]}
      />,
    );
    const arts = container.querySelectorAll('img[data-slot="wheel-sector-art"]');
    expect(arts).toHaveLength(1);
    expect(arts[0]?.getAttribute('src')).toBe('https://cdn/x.webp');
  });

  it('corona: arte y color del config global cuando existen', () => {
    const { container } = render(
      <WheelPreview
        sectors={SECTORS}
        crown={{ assetUrl: 'https://cdn/corona.webp', colorHex: '#4B0082' }}
      />,
    );
    const crownArt = container.querySelector('img[data-slot="wheel-crown-art"]');
    expect(crownArt?.getAttribute('src')).toBe('https://cdn/corona.webp');
    expect(sectorPaths(container).at(-1)?.getAttribute('fill')).toBe('#4B0082');
  });

  it('corona: cae al arte local y al morado de marca sin config', () => {
    const { container } = render(<WheelPreview sectors={SECTORS} />);
    const crownArt = container.querySelector('img[data-slot="wheel-crown-art"]');
    expect(crownArt?.getAttribute('src')).toBe('/duelo/corona.svg');
    expect(sectorPaths(container).at(-1)?.getAttribute('fill')).toBe('#B79AE8');
  });

  it('mantiene el pin GIRAR estático encima de la rueda', () => {
    const { container } = render(<WheelPreview sectors={SECTORS} />);
    expect(container.querySelector('img[data-slot="wheel-pin"]')?.getAttribute('src')).toBe(
      '/duelo/girar.svg',
    );
  });

  it('sin categorías dibuja solo la corona, sin romperse', () => {
    const { container } = render(<WheelPreview sectors={[]} />);
    expect(container.querySelector('circle[data-slot="wheel-sector"]')).not.toBeNull();
  });

  it('anuncia los sectores para lectores de pantalla', () => {
    render(<WheelPreview sectors={SECTORS} />);
    expect(
      screen.getByRole('img', { name: /Español, Matemática y la corona/ }),
    ).toBeInTheDocument();
  });
});
