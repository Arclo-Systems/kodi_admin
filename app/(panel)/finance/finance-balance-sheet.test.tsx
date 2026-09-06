import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BalanceSheet, BalanceSheetLine } from '@/hooks/use-finance';

let report: BalanceSheet | undefined;
let reportError = false;
const refetch = vi.fn();
const lastParams = vi.fn();

const downloadReport = vi.fn();
vi.mock('@/lib/download-report', () => ({
  downloadReport: (...args: unknown[]) => downloadReport(...args),
}));

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceBalanceSheet: (params: unknown) => {
    lastParams(params);
    return {
      data: reportError ? undefined : report,
      isLoading: false,
      isError: reportError,
      error: reportError ? new Error('Se cayó el reporte') : null,
      refetch,
    };
  },
}));

import { FinanceBalanceSheet } from './finance-balance-sheet';

const line = (over: Partial<BalanceSheetLine>): BalanceSheetLine => ({
  accountId: 'x',
  code: '0000',
  name: 'Cuenta',
  parentCode: null,
  depth: 0,
  isActive: true,
  isSubtotal: false,
  isBridge: false,
  computed: false,
  valuation: 'current',
  balance: '0.00',
  ...over,
});

const CUADRADO: BalanceSheet = {
  currency: 'CRC',
  asOf: '2026-10-02T05:59:59.999Z',
  consolidation: null,
  assets: {
    type: 'ASSET',
    lines: [
      line({ accountId: 'a0', code: '1000', name: 'Activos', isSubtotal: true, balance: '699000.00' }),
      line({
        accountId: 'a1',
        code: '1100',
        name: 'Efectivo y equivalentes',
        parentCode: '1000',
        depth: 1,
        isSubtotal: true,
        balance: '699000.00',
      }),
      line({
        accountId: 'a2',
        code: '1101',
        name: 'Caja colones',
        parentCode: '1100',
        depth: 2,
        balance: '599000.00',
      }),
      line({
        accountId: 'a3',
        code: '1190',
        name: 'Traslados entre monedas',
        parentCode: '1000',
        depth: 1,
        isBridge: true,
        balance: '100000.00',
      }),
    ],
    total: '699000.00',
  },
  liabilities: {
    type: 'LIABILITY',
    lines: [line({ accountId: 'p1', code: '2100', name: 'Cuentas por pagar', balance: '200000.00' })],
    total: '200000.00',
  },
  equity: {
    type: 'EQUITY',
    lines: [
      line({ accountId: 'e1', code: '3110', name: 'Aportes de socios', balance: '500000.00' }),
      line({
        accountId: null,
        code: null,
        name: 'Resultado del período (no cerrado)',
        computed: true,
        balance: '-1000.00',
      }),
    ],
    total: '499000.00',
  },
  totals: { assets: '699000.00', liabilities: '200000.00', equity: '499000.00' },
  balanced: true,
  difference: '0.00',
};

const DESCUADRADO: BalanceSheet = {
  ...CUADRADO,
  totals: { ...CUADRADO.totals, assets: '699033.33' },
  balanced: false,
  difference: '33.33',
};

const CONSOLIDADO: BalanceSheet = {
  ...CUADRADO,
  currency: 'USD',
  consolidation: {
    to: 'USD',
    rates: [{ from: 'CRC', to: 'USD', rate: '0.00200000', date: '2026-06-01', source: 'BCCR' }],
    missing: [],
  },
  assets: {
    ...CUADRADO.assets,
    lines: [
      ...CUADRADO.assets.lines.slice(0, 3),
      line({
        accountId: 'a3',
        code: '1190',
        name: 'Traslados entre monedas',
        parentCode: '1000',
        depth: 1,
        isBridge: true,
        valuation: 'historical',
        balance: '0.00',
      }),
    ],
  },
  equity: {
    ...CUADRADO.equity,
    lines: [
      ...CUADRADO.equity.lines,
      line({
        accountId: null,
        code: null,
        name: 'Ajuste por conversión',
        computed: true,
        valuation: 'cta',
        balance: '50.00',
      }),
    ],
  },
};

const SIN_TASA: BalanceSheet = {
  ...CONSOLIDADO,
  consolidation: { to: 'USD', rates: [], missing: ['CRC'] },
};

beforeEach(() => {
  vi.clearAllMocks();
  reportError = false;
  report = CUADRADO;
});

describe('FinanceBalanceSheet — el cuadre se ve siempre', () => {
  it('cuadrado: badge "Cuadra" y la identidad contable a la vista', () => {
    render(<FinanceBalanceSheet />);

    expect(screen.getByText('Cuadra')).toBeInTheDocument();
    expect(screen.getByText(/Activo = Pasivo \+ Patrimonio/)).toBeInTheDocument();
    expect(screen.queryByText(/No cuadra/)).toBeNull();
  });

  it('descuadrado: lo dice con la diferencia, no lo esconde', () => {
    report = DESCUADRADO;
    render(<FinanceBalanceSheet />);

    expect(screen.getByText(/No cuadra: 33,33/)).toBeInTheDocument();
    expect(screen.queryByText('Cuadra')).toBeNull();
  });
});

describe('FinanceBalanceSheet — las tres secciones', () => {
  it('pinta activos, pasivos y patrimonio con sus totales', () => {
    render(<FinanceBalanceSheet />);

    expect(screen.getByRole('table', { name: 'Activos' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Pasivos' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Patrimonio' })).toBeInTheDocument();
    expect(screen.getByText('Caja colones')).toBeInTheDocument();
  });

  it('la línea calculada del resultado se distingue de una cuenta', () => {
    render(<FinanceBalanceSheet />);

    const fila = screen
      .getByText('Resultado del período (no cerrado)')
      .closest('tr') as HTMLTableRowElement;
    expect(within(fila).getByText(/Calculada/)).toBeInTheDocument();
  });

  it('por moneda, 1190 se etiqueta como traslado entre monedas', () => {
    render(<FinanceBalanceSheet />);

    const fila = screen.getByText('Traslados entre monedas').closest('tr') as HTMLTableRowElement;
    expect(within(fila).getByText(/no es efectivo disponible/)).toBeInTheDocument();
  });
});

describe('FinanceBalanceSheet — consolidado', () => {
  it('muestra el banner con la tasa usada y su fecha', () => {
    report = CONSOLIDADO;
    render(<FinanceBalanceSheet />);

    expect(screen.getByText(/1 CRC = 0.00200000 USD/)).toBeInTheDocument();
    expect(screen.getByText(/tipo del 2026-06-01 \(BCCR\)/)).toBeInTheDocument();
  });

  it('la línea de ajuste por conversión va aparte y dice que no se realizó', () => {
    report = CONSOLIDADO;
    render(<FinanceBalanceSheet />);

    const fila = screen.getByText('Ajuste por conversión').closest('tr') as HTMLTableRowElement;
    expect(within(fila).getByText(/No se realizó/)).toBeInTheDocument();
  });

  it('1190 consolidada se explica como valorada a tasa histórica', () => {
    report = CONSOLIDADO;
    render(<FinanceBalanceSheet />);

    const fila = screen.getByText('Traslados entre monedas').closest('tr') as HTMLTableRowElement;
    expect(within(fila).getByText(/tasa histórica/)).toBeInTheDocument();
  });

  it('sin tipo de cambio dice N/A y que esos importes no se sumaron', () => {
    report = SIN_TASA;
    render(<FinanceBalanceSheet />);

    expect(screen.getByText(/Sin tipo de cambio para: CRC → N\/A/)).toBeInTheDocument();
    expect(screen.getByText(/NO están sumados en ningún total/)).toBeInTheDocument();
  });
});

describe('FinanceBalanceSheet — moneda y consolidado son excluyentes', () => {
  it('elegir "Consolidar a USD" manda consolidateTo y deja de mandar currency', async () => {
    render(<FinanceBalanceSheet />);
    expect(lastParams).toHaveBeenCalledWith(expect.objectContaining({ currency: 'CRC' }));

    fireEvent.click(screen.getByRole('combobox', { name: 'Moneda' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Consolidar a USD' }));

    await waitFor(() =>
      expect(lastParams).toHaveBeenLastCalledWith({ consolidateTo: 'USD', asOf: undefined }),
    );
  });
});

describe('FinanceBalanceSheet — un reporte caído no es un balance en cero', () => {
  it('con error no pinta el balance: dice que no pudo cargar y ofrece reintentar', () => {
    reportError = true;
    render(<FinanceBalanceSheet />);

    expect(screen.queryByText('Cuadra')).toBeNull();
    expect(screen.getByText('Se cayó el reporte')).toBeInTheDocument();
    // Las tres secciones también quedan vacías: decir "sin cuentas" ahí sería
    // afirmar que el balance está en cero.
    expect(screen.getAllByText('No se pudo cargar')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('FinanceBalanceSheet — CSV', () => {
  it('baja el archivo con los mismos parámetros del reporte', async () => {
    render(<FinanceBalanceSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    await waitFor(() =>
      expect(downloadReport).toHaveBeenCalledWith(
        '/api/admin/finance/reports/balance-sheet.csv?currency=CRC',
        'balance-general.csv',
      ),
    );
  });
});
