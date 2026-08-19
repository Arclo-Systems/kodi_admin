import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { ModuleIdentity } from '@/lib/user-detail';
import { ModuleChips } from './module-chips';

function moduleIdentity(over: Partial<ModuleIdentity> = {}): ModuleIdentity {
  return {
    shortName: 'PEN Secundaria',
    fullName: 'Prueba Nacional Estandarizada — Secundaria',
    examType: 'pen_secundaria',
    iconUrl: 'https://pub-abc.r2.dev/modules/pen-secundaria.webp',
    characterUrl: 'https://pub-abc.r2.dev/modules/pen-secundaria-char.webp',
    colorHex: '#A78BDA',
    ...over,
  };
}

describe('ModuleChips', () => {
  it('pinta el ícono que manda el wire, sin importar el examType', () => {
    const pen = moduleIdentity();
    render(<ModuleChips modules={[pen]} activeModule={null} />);
    expect(screen.getByRole('img', { name: 'PEN Secundaria' })).toHaveAttribute(
      'src',
      pen.iconUrl,
    );
  });

  it('sin iconUrl cae al personaje del módulo', () => {
    const pen = moduleIdentity({ iconUrl: null });
    render(<ModuleChips modules={[pen]} activeModule={null} />);
    expect(screen.getByRole('img', { name: 'PEN Secundaria' })).toHaveAttribute(
      'src',
      pen.characterUrl,
    );
  });

  it('sin arte muestra la inicial en un placeholder, no una imagen rota', () => {
    render(
      <ModuleChips
        modules={[moduleIdentity({ iconUrl: null, characterUrl: null })]}
        activeModule={null}
      />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('marca el módulo activo con el color del wire', () => {
    const pen = moduleIdentity();
    const paa = moduleIdentity({
      shortName: 'PAA',
      examType: 'paa',
      colorHex: '#F47C6B',
    });
    render(<ModuleChips modules={[pen, paa]} activeModule={paa} />);

    const activo = screen.getByText('Activo');
    expect(activo).toHaveStyle({ color: '#F47C6B' });
    expect(screen.getByText('PEN Secundaria').closest('div')).not.toHaveTextContent(
      'Activo',
    );
  });

  it('sin módulos registrados lo dice', () => {
    render(<ModuleChips modules={[]} activeModule={null} />);
    expect(screen.getByText('Sin módulos registrados.')).toBeInTheDocument();
  });
});
