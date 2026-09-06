import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrialBalance } from '@/hooks/use-finance';

let report: TrialBalance | undefined;
let reportError = false;
const refetch = vi.fn();

const downloadReport = vi.fn();
vi.mock('@/lib/download-report', () => ({
  downloadReport: (...args: unknown[]) => downloadReport(...args),
}));

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceTrialBalance: () => ({
    data: reportError ? undefined : report,
    isLoading: false,
    isError: reportError,
    error: reportError ? new Error('Se cayó el reporte') : null,
    refetch,
  }),
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
  vi.clearAllMocks();
  reportError = false;
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

  it('baja el CSV de la moneda elegida', async () => {
    render(<FinanceTrialBalance />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    await waitFor(() =>
      expect(downloadReport).toHaveBeenCalledWith(
        '/api/admin/finance/reports/trial-balance.csv?currency=CRC',
        'comprobacion.csv',
      ),
    );
  });
});

describe('FinanceTrialBalance — un reporte caído no es un período sin asientos', () => {
  it('con error no dice que no hay asientos: dice que no pudo cargar y ofrece reintentar', () => {
    reportError = true;
    render(<FinanceTrialBalance />);

    expect(screen.queryByText('Todavía no hay asientos en este período')).toBeNull();
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('FinanceTrialBalance — de la comprobación al mayor', () => {
  it('cada cuenta enlaza a su mayor con la misma moneda y el mismo rango', () => {
    render(<FinanceTrialBalance />);

    const fila = screen.getByText('Caja colones').closest('tr') as HTMLTableRowElement;
    expect(within(fila).getByRole('link', { name: /Mayor/ })).toHaveAttribute(
      'href',
      '/finance/mayor?accountId=a1&currency=CRC',
    );
  });
});
