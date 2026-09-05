import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrialBalance } from '@/hooks/use-finance';

let report: TrialBalance | undefined;

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceTrialBalance: () => ({ data: report, isLoading: false, isError: false, error: null }),
}));

import { FinanceTrialBalance } from './finance-trial-balance';

const CUADRADO: TrialBalance = {
  currency: 'CRC',
  range: { from: '2026-06-01T06:00:00.000Z', to: '2026-10-02T05:59:59.999Z' },
  accounts: [
    {
      accountId: 'a1',
      code: '1101',
      name: 'Caja colones',
      type: 'ASSET',
      debits: '3000.00',
      credits: '1650.50',
      balance: '1349.50',
    },
    {
      accountId: 'a2',
      code: '4110',
      name: 'Ingresos por suscripciones',
      type: 'INCOME',
      debits: '0.00',
      credits: '3000.00',
      balance: '3000.00',
    },
  ],
  totals: { debits: '4650.50', credits: '4650.50' },
  balanced: true,
  difference: '0.00',
};

beforeEach(() => {
  report = CUADRADO;
});

describe('FinanceTrialBalance — el descuadre se muestra, no se esconde', () => {
  it('avisa la diferencia exacta cuando los débitos no igualan a los créditos', () => {
    report = {
      ...CUADRADO,
      totals: { debits: '4683.83', credits: '4650.50' },
      balanced: false,
      difference: '33.33',
    };
    render(<FinanceTrialBalance />);

    expect(screen.getByText(/No cuadra: 33,33/)).toBeInTheDocument();
    expect(screen.queryByText('Cuadra')).not.toBeInTheDocument();
  });

  it('cuando cuadra lo dice y aun así deja la diferencia a la vista', () => {
    render(<FinanceTrialBalance />);

    expect(screen.getByText('Cuadra')).toBeInTheDocument();
    expect(screen.queryByText(/No cuadra/)).not.toBeInTheDocument();
    const diferencia = screen
      .getByText('Diferencia (débitos − créditos)')
      .closest('tr') as HTMLTableRowElement;
    expect(diferencia).toHaveTextContent('0,00');
  });

  it('suma los totales del período debajo de las cuentas con movimiento', () => {
    render(<FinanceTrialBalance />);

    const totales = screen.getByText('Totales').closest('tr') as HTMLTableRowElement;
    expect(totales).toHaveTextContent('4 650,50');
    expect(screen.getByText('Caja colones')).toBeInTheDocument();
    expect(screen.getByText('Ingresos por suscripciones')).toBeInTheDocument();
  });

  it('sin cuentas con movimiento explica el período en vez de mostrar totales en cero', () => {
    report = { ...CUADRADO, accounts: [] };
    render(<FinanceTrialBalance />);

    expect(screen.getByText('Todavía no hay asientos en este período')).toBeInTheDocument();
    expect(screen.queryByText('Totales')).not.toBeInTheDocument();
  });

  it('ofrece el CSV de la moneda elegida', () => {
    render(<FinanceTrialBalance />);

    expect(screen.getByRole('link', { name: 'Exportar CSV' })).toHaveAttribute(
      'href',
      '/api/admin/finance/reports/trial-balance.csv?currency=CRC',
    );
  });
});
