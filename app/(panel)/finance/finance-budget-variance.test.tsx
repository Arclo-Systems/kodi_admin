import type { ReactElement } from 'react';
import { render as rtlRender, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ApiError } from '@/lib/bff';
import type { BudgetVariance, Metric } from '@/hooks/use-finance-planning';

let report: BudgetVariance | undefined;
let reportError: Error | null = null;
const refetch = vi.fn();

vi.mock('@/hooks/use-finance-planning', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance-planning')>()),
  useBudgetVariance: () => ({
    data: reportError ? undefined : report,
    isLoading: false,
    isError: !!reportError,
    error: reportError,
    refetch,
  }),
}));

import { FinanceBudgetVariance } from './finance-budget-variance';

const render = (ui: ReactElement) => rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

const percent = (value: string): Metric => ({
  value,
  unit: 'percent',
  label: 'Variación sobre el presupuesto',
  na: null,
});

const PERCENT_NA: Metric = {
  value: null,
  unit: 'percent',
  label: 'Variación sobre el presupuesto',
  na: {
    reason: 'PRESUPUESTO_EN_CERO',
    message: 'La cuenta no estaba presupuestada: no hay contra qué medir el porcentaje.',
  },
};

const REPORT: BudgetVariance = {
  period: '2026-09',
  year: 2026,
  month: 9,
  currency: 'CRC',
  budget: { id: 'b1', name: 'Setiembre', status: 'ACTIVE' },
  lines: [
    {
      accountId: 'a1',
      code: '6210',
      name: 'Marketing y publicidad',
      type: 'OPERATING_EXPENSE',
      budget: '500000.00',
      actual: '620000.00',
      variance: '120000.00',
      variancePercent: percent('24.00'),
      favorable: false,
    },
    {
      accountId: 'a2',
      code: '4110',
      name: 'Ingresos por suscripciones',
      type: 'INCOME',
      budget: '1000000.00',
      actual: '1200000.00',
      variance: '200000.00',
      variancePercent: percent('20.00'),
      favorable: true,
    },
    {
      accountId: null,
      code: '6310',
      name: 'Servicios profesionales',
      type: 'OPERATING_EXPENSE',
      budget: '0.00',
      actual: '75000.00',
      variance: '75000.00',
      variancePercent: PERCENT_NA,
      favorable: false,
    },
  ],
  totalsByType: [
    {
      type: 'INCOME',
      budget: '1000000.00',
      actual: '1200000.00',
      variance: '200000.00',
      variancePercent: percent('20.00'),
      favorable: true,
    },
    {
      type: 'COST_OF_REVENUE',
      budget: '0.00',
      actual: '0.00',
      variance: '0.00',
      variancePercent: PERCENT_NA,
      favorable: true,
    },
    {
      type: 'OPERATING_EXPENSE',
      budget: '500000.00',
      actual: '695000.00',
      variance: '195000.00',
      variancePercent: percent('39.00'),
      favorable: false,
    },
  ],
  net: {
    budget: '500000.00',
    actual: '505000.00',
    variance: '5000.00',
    variancePercent: percent('1.00'),
    favorable: true,
  },
};

const fila = (texto: string): HTMLElement => {
  const celda = screen.getByText(texto);
  const row = celda.closest('tr');
  if (!row) throw new Error(`No hay fila para ${texto}`);
  return row;
};

beforeEach(() => {
  vi.clearAllMocks();
  reportError = null;
  report = REPORT;
});

describe('FinanceBudgetVariance — favorable no se deduce del signo', () => {
  it('un gasto por encima del presupuesto va en contra', () => {
    render(<FinanceBudgetVariance />);

    const row = fila('Marketing y publicidad');
    expect(within(row).getByText('120 000,00 CRC')).toBeInTheDocument();
    expect(within(row).getByText('en contra')).toBeInTheDocument();
  });

  it('un ingreso por encima del presupuesto va a favor, con la MISMA variación positiva', () => {
    render(<FinanceBudgetVariance />);

    const row = fila('Ingresos por suscripciones');
    expect(within(row).getByText('200 000,00 CRC')).toBeInTheDocument();
    expect(within(row).getByText('a favor')).toBeInTheDocument();
  });
});

describe('FinanceBudgetVariance — el porcentaje sin presupuesto es N/A', () => {
  it('dice N/A con el motivo, y nunca un 0 %', () => {
    render(<FinanceBudgetVariance />);

    const row = fila('Servicios profesionales');
    expect(within(row).getByText('N/A')).toBeInTheDocument();
    expect(
      within(row).getByRole('button', {
        name: /N\/A: La cuenta no estaba presupuestada/,
      }),
    ).toBeInTheDocument();
    expect(within(row).queryByText('0,00 %')).toBeNull();
  });

  it('la cuenta que se movió sin estar presupuestada aparece igual, marcada', () => {
    render(<FinanceBudgetVariance />);

    expect(within(fila('Servicios profesionales')).getByText(/Sin presupuestar/)).toBeInTheDocument();
  });
});

describe('FinanceBudgetVariance — totales por clase y neto', () => {
  it('muestra las tres clases y el resultado neto', () => {
    render(<FinanceBudgetVariance />);

    // Presupuesto, real y variación: la clase sin movimiento viaja igual, en cero.
    expect(within(fila('Costo de ingresos')).getAllByText('0,00 CRC')).toHaveLength(3);
    const neto = fila('Resultado neto');
    expect(within(neto).getByText('5 000,00 CRC')).toBeInTheDocument();
    expect(within(neto).getByText('1,00 %')).toBeInTheDocument();
  });
});

describe('FinanceBudgetVariance — un mes sin presupuesto no es un mes con presupuesto cero', () => {
  it('lo explica en vez de mostrar 100 % de sobregiro', () => {
    reportError = new ApiError('BUDGET_NOT_FOUND', 'No hay presupuesto', 404);
    render(<FinanceBudgetVariance />);

    expect(screen.getByText(/No hay presupuesto de ese mes/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('cualquier otro fallo sí ofrece reintentar', () => {
    reportError = new ApiError('UNKNOWN', 'Se cayó el reporte', 500);
    render(<FinanceBudgetVariance />);

    expect(screen.getByText('Se cayó el reporte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
