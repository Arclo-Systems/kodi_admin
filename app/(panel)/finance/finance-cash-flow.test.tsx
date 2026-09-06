import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CashFlow } from '@/hooks/use-finance';

let report: CashFlow | undefined;
let reportError = false;
const refetch = vi.fn();

const downloadReport = vi.fn();
vi.mock('@/lib/download-report', () => ({
  downloadReport: (...args: unknown[]) => downloadReport(...args),
}));

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceCashFlow: () => ({
    data: reportError ? undefined : report,
    isLoading: false,
    isError: reportError,
    error: reportError ? new Error('Se cayó el reporte') : null,
    refetch,
  }),
}));

import { FinanceCashFlow } from './finance-cash-flow';

const CON_MOVIMIENTO: CashFlow = {
  currency: 'CRC',
  range: { from: '2026-08-01T06:00:00.000Z', to: '2026-10-01T05:59:59.999Z' },
  accounts: [
    {
      accountId: 'c1',
      code: '1101',
      name: 'Caja colones',
      opening: '0.00',
      inflow: '700000.00',
      outflow: '101000.00',
      closing: '599000.00',
    },
    {
      accountId: 'c2',
      code: '1102',
      name: 'Caja dólares',
      opening: '0.00',
      inflow: '0.00',
      outflow: '0.00',
      closing: '0.00',
    },
  ],
  totals: { opening: '0.00', inflow: '800000.00', outflow: '101000.00', closing: '699000.00' },
  byMonth: [
    { month: '2026-08', inflow: '700000.00', outflow: '0.00', net: '700000.00' },
    { month: '2026-09', inflow: '100000.00', outflow: '101000.00', net: '-1000.00' },
  ],
};

const SIN_CAJAS: CashFlow = {
  ...CON_MOVIMIENTO,
  accounts: [],
  totals: { opening: '0.00', inflow: '0.00', outflow: '0.00', closing: '0.00' },
  byMonth: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  reportError = false;
  report = CON_MOVIMIENTO;
});

describe('FinanceCashFlow — la caja por cuenta', () => {
  it('lista cada caja con su inicial, entradas, salidas y final', () => {
    render(<FinanceCashFlow />);

    const fila = screen.getByText('Caja colones').closest('tr') as HTMLTableRowElement;
    expect(within(fila).getByText('700 000,00')).toBeInTheDocument();
    expect(within(fila).getByText('101 000,00')).toBeInTheDocument();
    expect(within(fila).getByText('599 000,00')).toBeInTheDocument();
  });

  it('una caja sin movimiento aparece en cero, no desaparece', () => {
    render(<FinanceCashFlow />);

    expect(screen.getByText('Caja dólares')).toBeInTheDocument();
  });

  it('cierra con la fila de totales del rango', () => {
    render(<FinanceCashFlow />);

    const fila = screen.getByText('Totales').closest('tr') as HTMLTableRowElement;
    expect(within(fila).getByText('800 000,00')).toBeInTheDocument();
    expect(within(fila).getByText('699 000,00')).toBeInTheDocument();
  });
});

describe('FinanceCashFlow — sin cajas en el rango', () => {
  it('lo dice y explica de dónde salen las cuentas de caja', () => {
    report = SIN_CAJAS;
    render(<FinanceCashFlow />);

    expect(screen.getByText('No hay cuentas de caja o banco')).toBeInTheDocument();
    expect(screen.queryByText('No se pudo cargar')).toBeNull();
  });
});

describe('FinanceCashFlow — un reporte caído no es una caja vacía', () => {
  it('dice que no pudo cargar y ofrece reintentar', () => {
    reportError = true;
    render(<FinanceCashFlow />);

    expect(screen.getByText('Se cayó el reporte')).toBeInTheDocument();
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    expect(screen.queryByText('No hay cuentas de caja o banco')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  // El gráfico también se queda sin datos, y ahí "sin movimientos" afirma lo
  // contrario de lo que se sabe.
  it('el gráfico tampoco dice "sin movimientos" cuando lo que falló fue la carga', () => {
    reportError = true;
    render(<FinanceCashFlow />);

    expect(screen.getByText('No se pudo cargar la serie mensual.')).toBeInTheDocument();
    expect(screen.queryByText('Sin movimientos de caja en el rango.')).toBeNull();
  });

  it('sin error y sin serie sí dice que el rango está vacío', () => {
    report = SIN_CAJAS;
    render(<FinanceCashFlow />);

    expect(screen.getByText('Sin movimientos de caja en el rango.')).toBeInTheDocument();
    expect(screen.queryByText('No se pudo cargar la serie mensual.')).toBeNull();
  });
});

describe('FinanceCashFlow — CSV', () => {
  it('baja el archivo con la moneda del reporte', async () => {
    render(<FinanceCashFlow />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    await waitFor(() =>
      expect(downloadReport).toHaveBeenCalledWith(
        '/api/admin/finance/reports/cash-flow.csv?currency=CRC',
        'flujo-de-caja.csv',
      ),
    );
  });
});
