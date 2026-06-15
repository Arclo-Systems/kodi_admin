import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TreeModule } from '@/hooks/use-modules-tree';

const tree: TreeModule[] = [
  {
    id: 'm1',
    country: 'CR',
    shortName: 'PAA',
    fullName: 'Prueba',
    isActive: true,
    questionCount: 0,
    subjects: [
      {
        id: 's1',
        name: 'Matemática',
        order: 1,
        questionCount: 0,
        topics: [{ id: 't1', name: 'Álgebra', order: 1, examWeight: null, questionCount: 0 }],
      },
    ],
  },
];

vi.mock('@/hooks/use-modules-tree', () => ({
  useModulesTree: () => ({ data: tree, isLoading: false }),
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('moduleId=m1'),
}));

import { IdsReference } from './ids-reference';

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe('IdsReference', () => {
  it('muestra materias del módulo preseleccionado', () => {
    render(<IdsReference />);
    expect(screen.getByText('Matemática')).toBeInTheDocument();
  });

  it('copia el id al hacer clic', () => {
    render(<IdsReference />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar ID s1' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('s1');
  });

  it('al cambiar a Temas muestra el tema', () => {
    render(<IdsReference />);
    fireEvent.click(screen.getByRole('tab', { name: 'Temas' }));
    expect(screen.getByText('Álgebra')).toBeInTheDocument();
  });
});
