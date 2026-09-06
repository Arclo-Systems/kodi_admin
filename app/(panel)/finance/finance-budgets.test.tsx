import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BudgetPage } from '@/hooks/use-finance-planning';

let budgets: BudgetPage;
const archive = vi.fn();
const update = vi.fn();
const refetch = vi.fn();

vi.mock('@/hooks/use-finance-planning', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance-planning')>()),
  useBudgets: () => ({
    data: budgets,
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  }),
  useBudget: () => ({ data: undefined, isLoading: false, isError: false }),
  useBudgetMutations: () => ({
    create: { mutateAsync: vi.fn() },
    update: { mutateAsync: update },
    replaceLines: { mutateAsync: vi.fn() },
    copyFrom: { mutateAsync: vi.fn() },
    archive: { mutateAsync: archive },
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// El editor de líneas tiene su propio archivo de tests: acá se monta cerrado y
// solo hace falta que no arrastre sus hooks de datos.
vi.mock('./finance-budget-lines-dialog', () => ({
  FinanceBudgetLinesDialog: () => null,
}));

import { FinanceBudgets } from './finance-budgets';

const VIGENTE = {
  id: 'b1',
  year: 2026,
  month: 9,
  period: '2026-09',
  currency: 'CRC',
  name: 'Setiembre',
  status: 'ACTIVE' as const,
  lineCount: 2,
  totalAmount: '2800000.00',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const fila = (nombre: string): HTMLElement => {
  const row = screen.getByText(nombre).closest('tr');
  if (!row) throw new Error(`No hay fila para ${nombre}`);
  return row;
};

beforeEach(() => {
  vi.clearAllMocks();
  budgets = { items: [VIGENTE], total: 1, page: 1, pageSize: 20 };
  archive.mockResolvedValue({});
  update.mockResolvedValue({});
});

describe('FinanceBudgets — el período se lee sin ambigüedad', () => {
  it('pinta período, estado y total con su moneda', () => {
    render(<FinanceBudgets canWrite />);

    const row = fila('Setiembre');
    expect(within(row).getByText('09/2026')).toBeInTheDocument();
    expect(within(row).getByText('Vigente')).toBeInTheDocument();
    expect(within(row).getByText('2 800 000,00 CRC')).toBeInTheDocument();
  });
});

describe('FinanceBudgets — un presupuesto no se borra: se archiva', () => {
  it('pide confirmación y explica que la variación sigue comparando contra él', async () => {
    render(<FinanceBudgets canWrite />);

    fireEvent.click(within(fila('Setiembre')).getByRole('button', { name: /Archivar/ }));

    expect(await screen.findByText(/¿Archivar Setiembre\?/)).toBeInTheDocument();
    expect(screen.getByText(/NO se borra/)).toBeInTheDocument();
    // Dentro del diálogo: el botón de la fila se llama igual.
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Archivar' }));

    await waitFor(() => expect(archive).toHaveBeenCalledWith('b1'));
  });

  it('un archivado ofrece desarchivar, porque el unique impide crear otro en su lugar', async () => {
    budgets = { ...budgets, items: [{ ...VIGENTE, status: 'ARCHIVED' }] };
    render(<FinanceBudgets canWrite />);

    fireEvent.click(within(fila('Setiembre')).getByRole('button', { name: /Desarchivar/ }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ id: 'b1', input: { status: 'ACTIVE' } }),
    );
  });

  it('un borrador se puede marcar vigente: es el único estado que mira la alerta de sobregiro', async () => {
    budgets = { ...budgets, items: [{ ...VIGENTE, status: 'DRAFT' }] };
    render(<FinanceBudgets canWrite />);

    fireEvent.click(within(fila('Setiembre')).getByRole('button', { name: /Marcar vigente/ }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ id: 'b1', input: { status: 'ACTIVE' } }),
    );
  });
});

describe('FinanceBudgets — sin finance:write no se edita', () => {
  it('no ofrece crear, editar líneas ni archivar', () => {
    render(<FinanceBudgets />);

    expect(screen.queryByRole('button', { name: /Nuevo presupuesto/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar líneas' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Archivar/ })).toBeNull();
    // Verlo sí: el gating es de escritura, no de lectura.
    expect(screen.getByText('Setiembre')).toBeInTheDocument();
  });
});
