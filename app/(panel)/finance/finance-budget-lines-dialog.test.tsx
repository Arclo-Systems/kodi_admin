import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FinanceAccount } from '@/hooks/use-finance';
import type { BudgetDetail, BudgetPage } from '@/hooks/use-finance-planning';

let budget: BudgetDetail;
const replaceLines = vi.fn();
const copyFrom = vi.fn();

const SOURCES: BudgetPage = {
  items: [
    {
      id: 'b-agosto',
      year: 2026,
      month: 8,
      period: '2026-08',
      currency: 'CRC',
      name: 'Agosto',
      status: 'ACTIVE',
      lineCount: 2,
      totalAmount: '500000.00',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 100,
};

const ACCOUNTS: FinanceAccount[] = [
  {
    id: 'a-padre',
    code: '6100',
    name: 'Gastos operativos',
    type: 'OPERATING_EXPENSE',
    currency: null,
    parentId: null,
    isActive: true,
    allowsManualEntry: false,
    isSystem: false,
    sortOrder: 1,
    parentCode: null,
    depth: 0,
  },
  {
    id: 'a-marketing',
    code: '6210',
    name: 'Marketing y publicidad',
    type: 'OPERATING_EXPENSE',
    currency: null,
    parentId: 'a-padre',
    isActive: true,
    allowsManualEntry: true,
    isSystem: false,
    sortOrder: 2,
    parentCode: '6100',
    depth: 1,
  },
  {
    id: 'a-retirada',
    code: '6900',
    name: 'Cuenta retirada',
    type: 'OPERATING_EXPENSE',
    currency: null,
    parentId: 'a-padre',
    isActive: false,
    allowsManualEntry: true,
    isSystem: false,
    sortOrder: 3,
    parentCode: '6100',
    depth: 1,
  },
  {
    id: 'a-caja',
    code: '1101',
    name: 'Caja colones',
    type: 'ASSET',
    currency: 'CRC',
    parentId: null,
    isActive: true,
    allowsManualEntry: true,
    isSystem: false,
    sortOrder: 4,
    parentCode: null,
    depth: 0,
  },
];

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceAccounts: () => ({ data: ACCOUNTS, isLoading: false, isError: false }),
}));

vi.mock('@/hooks/use-finance-planning', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance-planning')>()),
  useBudget: () => ({ data: budget, isLoading: false, isError: false }),
  useBudgets: () => ({ data: SOURCES, isLoading: false, isError: false }),
  useBudgetMutations: () => ({
    replaceLines: { mutateAsync: replaceLines },
    copyFrom: { mutateAsync: copyFrom },
    create: { mutateAsync: vi.fn() },
    update: { mutateAsync: vi.fn() },
    archive: { mutateAsync: vi.fn() },
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { FinanceBudgetLinesDialog, budgetableAccounts } from './finance-budget-lines-dialog';

const DETALLE: BudgetDetail = {
  id: 'b-setiembre',
  year: 2026,
  month: 9,
  period: '2026-09',
  currency: 'CRC',
  name: 'Setiembre',
  status: 'ACTIVE',
  lineCount: 1,
  totalAmount: '300000.00',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  lines: [
    {
      accountId: 'a-marketing',
      code: '6210',
      name: 'Marketing y publicidad',
      type: 'OPERATING_EXPENSE',
      amount: '300000.00',
    },
  ],
  totalsByType: {
    INCOME: '0.00',
    COST_OF_REVENUE: '0.00',
    OPERATING_EXPENSE: '300000.00',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  budget = DETALLE;
  replaceLines.mockResolvedValue({});
  copyFrom.mockResolvedValue({});
});

describe('budgetableAccounts — sobre qué cuentas se puede presupuestar', () => {
  it('deja solo las hojas de resultado activas', () => {
    expect(budgetableAccounts(ACCOUNTS).map((a) => a.code)).toEqual(['6210']);
  });
});

describe('FinanceBudgetLinesDialog — guardar es un reemplazo total', () => {
  it('manda los montos como STRING, tal cual se tecleó', async () => {
    render(<FinanceBudgetLinesDialog budgetId="b-setiembre" onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto de 6210 Marketing y publicidad'), {
      target: { value: '450000.50' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar presupuesto/ }));

    await waitFor(() => expect(replaceLines).toHaveBeenCalled());
    expect(replaceLines).toHaveBeenCalledWith({
      id: 'b-setiembre',
      lines: [{ accountId: 'a-marketing', amount: '450000.50' }],
    });
    const [{ lines }] = replaceLines.mock.calls[0] as [{ lines: { amount: unknown }[] }];
    expect(typeof lines[0]?.amount).toBe('string');
  });

  it('una cuenta vacía sale del presupuesto: no se manda en cero', async () => {
    render(<FinanceBudgetLinesDialog budgetId="b-setiembre" onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto de 6210 Marketing y publicidad'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar presupuesto/ }));

    await waitFor(() => expect(replaceLines).toHaveBeenCalledWith({ id: 'b-setiembre', lines: [] }));
  });

  it('rechaza un monto en cero antes de mandarlo: el backend lo contesta 400', async () => {
    render(<FinanceBudgetLinesDialog budgetId="b-setiembre" onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto de 6210 Marketing y publicidad'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar presupuesto/ }));

    expect(await screen.findByText(/mayor que cero/)).toBeInTheDocument();
    expect(replaceLines).not.toHaveBeenCalled();
  });
});

describe('FinanceBudgetLinesDialog — copiar de otro presupuesto', () => {
  it('solo ofrece los de la misma moneda y manda el origen elegido', async () => {
    render(<FinanceBudgetLinesDialog budgetId="b-setiembre" onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Copiar de' }));
    fireEvent.click(await screen.findByRole('option', { name: /Agosto/ }));
    fireEvent.click(screen.getByRole('button', { name: /Copiar líneas/ }));

    await waitFor(() =>
      expect(copyFrom).toHaveBeenCalledWith({ id: 'b-setiembre', sourceId: 'b-agosto' }),
    );
  });
});

describe('FinanceBudgetLinesDialog — un presupuesto archivado no se edita', () => {
  it('lo dice y deja el guardado deshabilitado', () => {
    budget = { ...DETALLE, status: 'ARCHIVED' };
    render(<FinanceBudgetLinesDialog budgetId="b-setiembre" onOpenChange={vi.fn()} />);

    expect(screen.getByText(/está archivado/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar presupuesto/ })).toBeDisabled();
  });
});
