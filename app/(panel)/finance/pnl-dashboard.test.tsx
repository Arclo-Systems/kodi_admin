import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pnl } from '@/hooks/use-finance';

let pnl: Pnl | undefined;
let consolidado: Pnl | undefined;
let pnlError = false;
const refetch = vi.fn();

const downloadReport = vi.fn();
vi.mock('@/lib/download-report', () => ({
  downloadReport: (...args: unknown[]) => downloadReport(...args),
}));

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  // Consolidando, el backend COLAPSA byCurrency/byAccount/byMonth a la moneda de
  // destino y agrega el bloque `consolidation`: el mock replica ese cambio de
  // forma, que es a lo que la pantalla tiene que reaccionar.
  useFinancePnl: (params: { consolidateTo?: string }) => ({
    data: pnlError ? undefined : params.consolidateTo ? consolidado : pnl,
    isLoading: false,
    isError: pnlError,
    refetch,
  }),
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
  consolidation: null,
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

// Colapsado a USD a 0,002: los ₡3.000 de ingreso son US$6,00.
const CONSOLIDADO: Pnl = {
  ...REPORT,
  consolidation: {
    to: 'USD',
    rates: [{ from: 'CRC', to: 'USD', rate: '0.00200000', date: '2026-06-01', source: 'BCCR' }],
    missing: [],
  },
  byCurrency: [
    {
      currency: 'USD',
      income: '6.00',
      costOfRevenue: '0.50',
      operatingExpense: '102.80',
      net: '-97.30',
    },
  ],
  byAccount: [
    {
      currency: 'USD',
      accountCode: '4110',
      accountName: 'Ingresos por suscripciones',
      type: 'INCOME',
      amount: '6.00',
    },
  ],
  byMonth: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  pnlError = false;
  pnl = REPORT;
  consolidado = CONSOLIDADO;
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

// El reporte cae a la primera moneda de `byCurrency` cuando la elegida no está
// ahí. El selector tiene que caer con él: decir "CRC" sobre unos KPI en USD es la
// peor forma de equivocarse con plata.
describe('PnlDashboard — el selector dice la moneda que se está pintando', () => {
  it('solo ofrece las monedas que el reporte trae', async () => {
    pnl = { ...REPORT, byCurrency: [REPORT.byCurrency[1]!] }; // solo USD
    render(<PnlDashboard />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Moneda' }));

    expect(await screen.findByRole('option', { name: 'USD' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'CRC' })).toBeNull();
    // Consolidar a una moneda sin movimientos sí es válido: no se acota.
    expect(screen.getByRole('option', { name: 'Consolidar a CRC' })).toBeInTheDocument();
  });

  // Sin este test, cambiar `value={scopeValue}` por `value={scope}` no rompe
  // nada: los demás eligen la moneda a mano, y ahí las dos coinciden. El agujero
  // aparece cuando NADIE la eligió — el estado sigue en CRC y el reporte ya cayó
  // a la única que hay.
  it('sin tocar el selector, el trigger dice la moneda que se está pintando', () => {
    pnl = { ...REPORT, byCurrency: [REPORT.byCurrency[1]!] }; // solo USD; el estado sigue en CRC
    render(<PnlDashboard />);

    expect(kpi('Ingresos (USD)')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveTextContent('USD');
    expect(screen.getByRole('combobox', { name: 'Moneda' })).not.toHaveTextContent('CRC');
  });

  it('si la moneda elegida desaparece del rango, el selector se sincroniza con los KPI', async () => {
    render(<PnlDashboard />);
    expect(kpi('Ingresos (CRC)')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveTextContent('CRC');

    // El rango nuevo ya no tiene colones: el reporte pasa a dólares.
    pnl = { ...REPORT, byCurrency: [REPORT.byCurrency[1]!] };
    fireEvent.click(screen.getByRole('combobox', { name: 'Moneda' }));
    fireEvent.click(await screen.findByRole('option', { name: 'USD' }));

    expect(kpi('Ingresos (USD)')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveTextContent('USD');
    expect(screen.queryByText('Ingresos (CRC)')).toBeNull();
  });

  it('sin datos ofrece las dos: un selector vacío no se puede usar ni para volver', async () => {
    pnl = { ...REPORT, byCurrency: [], byAccount: [], byMonth: [] };
    render(<PnlDashboard />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Moneda' }));

    expect(await screen.findByRole('option', { name: 'CRC' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'USD' })).toBeInTheDocument();
  });
});

describe('PnlDashboard — consolidado a una moneda', () => {
  it('etiqueta con qué tasa y de qué fecha convirtió', async () => {
    render(<PnlDashboard />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Moneda' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Consolidar a USD' }));

    expect(await screen.findByText(/1 CRC = 0.00200000 USD/)).toBeInTheDocument();
    expect(screen.getByText(/tipo del 2026-06-01 \(BCCR\)/)).toBeInTheDocument();
    expect(kpi('Ingresos (USD)')).toHaveTextContent('6,00');
  });

  it('sin tipo de cambio dice N/A, y no que el rango esté vacío', async () => {
    consolidado = {
      ...REPORT,
      consolidation: { to: 'USD', rates: [], missing: ['CRC'] },
      byCurrency: [],
      byAccount: [],
      byMonth: [],
    };
    render(<PnlDashboard />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Moneda' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Consolidar a USD' }));

    expect(await screen.findByText(/Sin tipo de cambio para: CRC → N\/A/)).toBeInTheDocument();
    expect(screen.queryByText(/Sin movimientos en el rango/)).toBeNull();
  });
});

describe('PnlDashboard — un reporte caído no es un rango sin movimientos', () => {
  it('con error no invita a cargar gastos: dice que no pudo cargar y ofrece reintentar', () => {
    pnlError = true;
    render(<PnlDashboard />);

    expect(screen.queryByText(/Sin movimientos en el rango/)).toBeNull();
    expect(screen.getByText('No se pudo cargar el estado de resultados.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});
