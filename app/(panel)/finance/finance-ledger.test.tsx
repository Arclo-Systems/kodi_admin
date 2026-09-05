import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FinanceAccount, Ledger } from '@/hooks/use-finance';

let ledger: Ledger | undefined;

const downloadReport = vi.fn();
vi.mock('@/lib/download-report', () => ({
  downloadReport: (...args: unknown[]) => downloadReport(...args),
}));
let accounts: FinanceAccount[] = [];

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceAccounts: () => ({
    data: accounts,
    isLoading: false,
    isError: false,
    isSuccess: true,
    refetch: vi.fn(),
  }),
  useFinanceLedger: () => ({ data: ledger, isLoading: false, isError: false, error: null }),
}));

import { FinanceLedger } from './finance-ledger';

const CUENTA: FinanceAccount = {
  id: 'acc-6900',
  code: '6900',
  name: 'Otros gastos operativos',
  type: 'OPERATING_EXPENSE',
  currency: null,
  parentId: 'acc-6000',
  isActive: true,
  allowsManualEntry: true,
  sortOrder: 0,
  parentCode: '6000',
  depth: 1,
};

const LEDGER: Ledger = {
  account: {
    id: CUENTA.id,
    code: CUENTA.code,
    name: CUENTA.name,
    type: CUENTA.type,
    currency: null,
  },
  currency: 'CRC',
  range: { from: '2026-06-01T06:00:00.000Z', to: '2026-10-02T05:59:59.999Z' },
  openingBalance: '0.00',
  lines: [
    {
      date: '2026-07-01T18:00:00.000Z',
      entryId: 'je-1',
      entryNumber: '2026-000001',
      entryStatus: 'POSTED',
      description: 'Tecnología — Railway',
      debit: '1000.00',
      credit: '0.00',
      runningBalance: '1000.00',
    },
    {
      date: '2026-08-01T18:00:00.000Z',
      entryId: 'je-2',
      entryNumber: '2026-000002',
      entryStatus: 'REVERSED',
      description: 'Tecnología — Vercel',
      debit: '400.00',
      credit: '0.00',
      runningBalance: '1400.00',
    },
  ],
  closingBalance: '1400.00',
  total: 2,
  page: 1,
  pageSize: 50,
};

async function elegirCuenta(): Promise<void> {
  fireEvent.click(await screen.findByRole('combobox', { name: 'Cuenta' }));
  fireEvent.click(await screen.findByRole('option', { name: '6900 Otros gastos operativos' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  accounts = [CUENTA];
  ledger = LEDGER;
});

describe('FinanceLedger — el saldo corrido es lo que el mayor tiene que mostrar', () => {
  it('pinta cada línea con su corrido y los saldos de apertura y cierre del rango', async () => {
    render(<FinanceLedger />);
    await elegirCuenta();

    await waitFor(() => expect(screen.getByText('2026-000001')).toBeInTheDocument());
    const primera = screen.getByText('2026-000001').closest('tr') as HTMLTableRowElement;
    expect(primera).toHaveTextContent('1 000,00');
    const segunda = screen.getByText('2026-000002').closest('tr') as HTMLTableRowElement;
    expect(segunda).toHaveTextContent('400,00');
    // El corrido de la última línea es el saldo final del rango, no el de la página.
    expect(segunda).toHaveTextContent('1 400,00');
    expect(screen.getByText('Saldo inicial').closest('div')).toHaveTextContent('0,00');
    expect(screen.getByText('Saldo final').closest('div')).toHaveTextContent('1 400,00');
  });

  it('marca el asiento reversado sin sacarlo del libro', async () => {
    render(<FinanceLedger />);
    await elegirCuenta();

    await waitFor(() => expect(screen.getByText('2026-000002')).toBeInTheDocument());
    expect(screen.getByText('Reversado')).toBeInTheDocument();
  });

  it('sin líneas en el período lo dice y no finge una tabla vacía', async () => {
    ledger = { ...LEDGER, lines: [], total: 0, closingBalance: '0.00' };
    render(<FinanceLedger />);
    await elegirCuenta();

    await waitFor(() =>
      expect(
        screen.getByText('Todavía no hay asientos en esta cuenta para el período'),
      ).toBeInTheDocument(),
    );
  });

  it('sin cuenta elegida explica qué falta en vez de mostrar una tabla vacía', () => {
    render(<FinanceLedger />);

    expect(screen.getByText(/Elegí una cuenta y una moneda/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('el CSV lleva la cuenta y la moneda que se están mirando', async () => {
    render(<FinanceLedger />);
    await elegirCuenta();

    fireEvent.click(await screen.findByRole('button', { name: 'Exportar CSV' }));

    await waitFor(() =>
      expect(downloadReport).toHaveBeenCalledWith(
        '/api/admin/finance/reports/ledger.csv?accountId=acc-6900&currency=CRC',
        'mayor.csv',
      ),
    );
  });
});
