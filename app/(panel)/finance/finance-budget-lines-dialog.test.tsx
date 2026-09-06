import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

  // Desde la Fase 5 el backend admite el cero (`budget_lines_amount_non_negative`),
  // y NO es lo mismo que dejarlo vacío: presupuestar cero dice que esa cuenta no
  // debía gastar nada, y la variación lo mide contra el real; dejarlo vacío la
  // saca del presupuesto y la fila aparece "sin presupuestar".
  it('el cero se manda como línea: presupuestar cero no es no presupuestar', async () => {
    render(<FinanceBudgetLinesDialog budgetId="b-setiembre" onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto de 6210 Marketing y publicidad'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar presupuesto/ }));

    await waitFor(() =>
      expect(replaceLines).toHaveBeenCalledWith({
        id: 'b-setiembre',
        lines: [{ accountId: 'a-marketing', amount: '0' }],
      }),
    );
  });

  it('un monto a medio escribir sigue rechazándose antes de mandarlo', async () => {
    render(<FinanceBudgetLinesDialog budgetId="b-setiembre" onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto de 6210 Marketing y publicidad'), {
      target: { value: '1.234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar presupuesto/ }));

    expect(await screen.findByText(/hasta 2 decimales/)).toBeInTheDocument();
    expect(replaceLines).not.toHaveBeenCalled();
  });
});

describe('FinanceBudgetLinesDialog — las líneas huérfanas se ven antes de perderse', () => {
  // Una cuenta presupuestada puede dejar de ser presupuestable después (la
  // retiran, o le cuelgan hijas). El `PUT` es un reemplazo TOTAL: si el
  // formulario no la muestra, guardar la borra sin que nadie se entere.
  beforeEach(() => {
    budget = {
      ...DETALLE,
      lineCount: 2,
      totalAmount: '380000.00',
      lines: [
        ...DETALLE.lines,
        {
          accountId: 'a-retirada',
          code: '6900',
          name: 'Cuenta retirada',
          type: 'OPERATING_EXPENSE',
          amount: '80000.00',
        },
      ],
    };
  });

  it('las lista aparte, con su monto y el aviso de que al guardar se quitan', () => {
    render(<FinanceBudgetLinesDialog budgetId="b-setiembre" onOpenChange={vi.fn()} />);

    expect(screen.getByText('Cuentas que ya no se pueden presupuestar')).toBeInTheDocument();
    const huerfana = screen.getByText('Cuenta retirada').closest('tr');
    expect(within(huerfana as HTMLElement).getByText('80 000,00 CRC')).toBeInTheDocument();
    // Solo lectura: no hay dónde teclearles un monto.
    expect(within(huerfana as HTMLElement).queryByRole('textbox')).toBeNull();
    expect(screen.getByText(/al guardar se quitan del presupuesto/)).toBeInTheDocument();
  });

  it('guardar las quita, que es exactamente lo que el aviso anuncia', async () => {
    render(<FinanceBudgetLinesDialog budgetId="b-setiembre" onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Guardar presupuesto/ }));

    await waitFor(() => expect(replaceLines).toHaveBeenCalled());
    const [{ lines }] = replaceLines.mock.calls[0] as [{ lines: { accountId: string }[] }];
    expect(lines.map((l) => l.accountId)).toEqual(['a-marketing']);
  });
});

describe('FinanceBudgetLinesDialog — el subtotal por clase sigue lo tecleado', () => {
  it('se recalcula al escribir, en vez de repetir el total guardado', () => {
    render(<FinanceBudgetLinesDialog budgetId="b-setiembre" onOpenChange={vi.fn()} />);

    const subtotal = screen.getByText('Gasto operativo').closest('tr');
    expect(within(subtotal as HTMLElement).getByText('300 000,00 CRC')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Monto de 6210 Marketing y publicidad'), {
      target: { value: '450000.50' },
    });

    expect(within(subtotal as HTMLElement).getByText('450 000,50 CRC')).toBeInTheDocument();
  });

  it('con un monto a medio escribir no inventa un subtotal más bajo', () => {
    render(<FinanceBudgetLinesDialog budgetId="b-setiembre" onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto de 6210 Marketing y publicidad'), {
      target: { value: '1.234' },
    });

    const subtotal = screen.getByText('Gasto operativo').closest('tr');
    expect(within(subtotal as HTMLElement).getByText('Revisá los montos')).toBeInTheDocument();
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
