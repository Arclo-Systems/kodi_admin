import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ModuleMultiSelect } from './module-multi-select';

const OPCIONES = [
  { id: 'm1', shortName: 'PAA' },
  { id: 'm2', shortName: 'COSEVI' },
  { id: 'm3', shortName: 'PEN' },
];

// Radix abre el menú en `pointerdown`, no en `click`: con `click` a secas el
// contenido nunca se monta y la consulta falla por "no existe".
function abrirMenu(): void {
  fireEvent.pointerDown(
    screen.getByRole('button', { name: /elegir módulos/i }),
    { button: 0, ctrlKey: false, pointerType: 'mouse' },
  );
}

describe('ModuleMultiSelect', () => {
  it('sin selección invita a elegir', () => {
    render(
      <ModuleMultiSelect options={OPCIONES} value={[]} onChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /elegir módulos/i })).toHaveTextContent(
      'Elegí los módulos',
    );
  });

  it('marcar un módulo lo agrega sin pisar los ya elegidos', () => {
    const onChange = vi.fn();
    render(
      <ModuleMultiSelect options={OPCIONES} value={['m1']} onChange={onChange} />,
    );
    abrirMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'COSEVI' }));
    expect(onChange).toHaveBeenCalledWith(['m1', 'm2']);
  });

  it('desmarcar un módulo lo quita y deja el resto', () => {
    const onChange = vi.fn();
    render(
      <ModuleMultiSelect
        options={OPCIONES}
        value={['m1', 'm2']}
        onChange={onChange}
      />,
    );
    abrirMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'PAA' }));
    expect(onChange).toHaveBeenCalledWith(['m2']);
  });

  // El chip con la X es la salida rápida sin volver a abrir el menú.
  it('el chip quita su módulo', () => {
    const onChange = vi.fn();
    render(
      <ModuleMultiSelect
        options={OPCIONES}
        value={['m1', 'm3']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /quitar pen/i }));
    expect(onChange).toHaveBeenCalledWith(['m1']);
  });

  it('muestra un chip por módulo elegido', () => {
    render(
      <ModuleMultiSelect
        options={OPCIONES}
        value={['m1', 'm2']}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  // Un id que ya no está en el árbol (módulo borrado, o país cambiado) no puede
  // reventar el render ni contarse como chip fantasma.
  it('ignora ids que no están entre las opciones', () => {
    render(
      <ModuleMultiSelect
        options={OPCIONES}
        value={['m1', 'borrado']}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
});
