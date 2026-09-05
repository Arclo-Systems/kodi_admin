import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pnl } from '@/hooks/use-finance';

let pnl: Pnl | undefined;

const downloadReport = vi.fn();
vi.mock('@/lib/download-report', () => ({
  downloadReport: (...args: unknown[]) => downloadReport(...args),
}));

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinancePnl: () => ({ data: pnl, isLoading: false, isError: false }),
}));

// recharts mide el contenedor con ResizeObserver, que jsdom no tiene.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

import { PnlDashboard } from './pnl-dashboard';

const REPORT: Pnl = {
  range: { from: '2026-06-01T06:00:00.000Z', to: '2026-10-02T05:59:59.999Z' },
  byCurrency: [
    {
      currency: 'CRC',
      income: '3000.00',
      costOfRevenue: '250.50',
      operatingExpense: '1400.00',
      net: '1349.50',
    },
    {
      currency: 'USD',
      income: '0.00',
      costOfRevenue: '0.00',
      operatingExpense: '100.00',
      net: '-100.00',
    },
  ],
  byAccount: [
    {
      currency: 'CRC',
      accountCode: '4110',
      accountName: 'Ingresos por suscripciones',
      type: 'INCOME',
      amount: '3000.00',
    },
    {
      currency: 'USD',
      accountCode: '6110',
      accountName: 'Tecnología y software',
      type: 'OPERATING_EXPENSE',
      amount: '100.00',
    },
  ],
  byMonth: [
    { currency: 'CRC', month: '2026-08', income: '3000.00', expense: '650.50', net: '2349.50' },
  ],
};

const kpi = (label: string) =>
  screen.getByText(label).closest('[data-slot="card"]') as HTMLElement;

beforeEach(() => {
  pnl = REPORT;
});

describe('PnlDashboard — los KPI salen de byCurrency del mayor', () => {
  it('separa costo de ingresos de gasto operativo en vez de un solo bucket', () => {
    render(<PnlDashboard />);

    expect(kpi('Ingresos (CRC)')).toHaveTextContent('3 000,00');
    expect(kpi('Costo de ingresos (CRC)')).toHaveTextContent('250,50');
    expect(kpi('Gastos operativos (CRC)')).toHaveTextContent('1 400,00');
    expect(kpi('Neto (CRC)')).toHaveTextContent('1 349,50');
  });

  it('pinta el desglose por cuenta de la moneda elegida, no el de todas', () => {
    render(<PnlDashboard />);

    expect(screen.getByText('Ingresos por suscripciones')).toBeInTheDocument();
    expect(screen.queryByText('Tecnología y software')).not.toBeInTheDocument();
  });

  it('baja el CSV del mismo rango que se está mirando, por fetch y no por href', async () => {
    render(<PnlDashboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    await waitFor(() =>
      expect(downloadReport).toHaveBeenCalledWith(
        '/api/admin/finance/reports/pnl.csv',
        'resultados.csv',
      ),
    );
  });

  it('sin monedas en el rango explica qué hacer en vez de mostrar ceros', () => {
    pnl = { ...REPORT, byCurrency: [], byAccount: [], byMonth: [] };
    render(<PnlDashboard />);

    expect(screen.getByText(/Sin movimientos en el rango/)).toBeInTheDocument();
    expect(screen.queryByText('Ingresos (CRC)')).not.toBeInTheDocument();
  });
});
