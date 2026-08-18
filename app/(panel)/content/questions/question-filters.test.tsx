import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    render(<QuestionFilters value={{ status: 'review', page: 4, pageSize: 20 }} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: LIMPIAR }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_QUESTION_LIST_QUERY);
  });
});

const BUSCADOR = 'Buscar preguntas por texto';

describe('QuestionFilters — buscador', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('no serializa en cada tecla: espera a que la mano pare', () => {
    const onChange = vi.fn();
    render(<QuestionFilters value={{ page: 4, pageSize: 20 }} onChange={onChange} />);
    const input = screen.getByLabelText(BUSCADOR);

    fireEvent.change(input, { target: { value: 'geo' } });
    fireEvent.change(input, { target: { value: 'geometría' } });
    act(() => vi.advanceTimersByTime(299));
    expect(onChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ search: 'geometría', page: 1, pageSize: 20 });
  });

  it('borrar el texto quita el filtro', () => {
    const onChange = vi.fn();
    render(<QuestionFilters value={{ search: 'geo', page: 1, pageSize: 20 }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(BUSCADOR), { target: { value: '' } });
    act(() => vi.advanceTimersByTime(300));

    expect(onChange).toHaveBeenCalledWith({ search: undefined, page: 1, pageSize: 20 });
  });

  it('limpiar los filtros también vacía el input, sin reponer lo tecleado', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <QuestionFilters value={{ search: 'geo', page: 1, pageSize: 20 }} onChange={onChange} />,
    );

    fireEvent.change(screen.getByLabelText(BUSCADOR), { target: { value: 'geometría' } });
    rerender(<QuestionFilters value={DEFAULT_QUESTION_LIST_QUERY} onChange={onChange} />);
    act(() => vi.advanceTimersByTime(600));

    expect(screen.getByLabelText(BUSCADOR)).toHaveValue('');
    expect(onChange).not.toHaveBeenCalled();
  });
});
