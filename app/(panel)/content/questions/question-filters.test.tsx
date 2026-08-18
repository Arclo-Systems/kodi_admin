import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_QUESTION_LIST_QUERY } from '@/lib/question-list-query-url';

vi.mock('@/hooks/use-modules-tree', () => ({
  useModulesTree: () => ({ data: [], isLoading: false }),
}));

import { QuestionFilters } from './question-filters';

const LIMPIAR = /limpiar filtros/i;

describe('QuestionFilters — limpiar', () => {
  it('sin filtros no ofrece limpiar', () => {
    render(<QuestionFilters value={DEFAULT_QUESTION_LIST_QUERY} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: LIMPIAR })).not.toBeInTheDocument();
  });

  it('con un filtro activo limpia a los valores por defecto', () => {
    const onChange = vi.fn();
    render(
      <QuestionFilters
        value={{ status: 'review', page: 3, pageSize: 50 }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: LIMPIAR }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_QUESTION_LIST_QUERY);
  });

  it('cambiar un filtro vuelve a la página 1', () => {
    const onChange = vi.fn();
    render(
      <QuestionFilters value={{ search: 'algo', page: 4, pageSize: 20 }} onChange={onChange} />,
    );

    fireEvent.change(screen.getByLabelText('Buscar preguntas por texto'), {
      target: { value: 'otra cosa' },
    });
    expect(onChange).toHaveBeenCalledWith({ search: 'otra cosa', page: 1, pageSize: 20 });
  });
});
