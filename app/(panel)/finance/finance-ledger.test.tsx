import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FinanceAccount, Ledger } from '@/hooks/use-finance';

let ledger: Ledger | undefined;
let ledgerError = false;
const refetch = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }));

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
  useFinanceLedger: () => ({
    data: ledgerError ? undefined : ledger,
    isLoading: false,
    isError: ledgerError,
    error: ledgerError ? new Error('Se cayó el mayor') : null,
    refetch,
  }),
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
  isSystem: false,
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
  searchParams = new URLSearchParams();
  ledgerError = false;
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

describe('FinanceLedger — un mayor caído no es una cuenta sin asientos', () => {
  it('con error no dice que no hay asientos: dice que no pudo cargar y ofrece reintentar', async () => {
    ledgerError = true;
    render(<FinanceLedger />);
    await elegirCuenta();

    await waitFor(() => expect(screen.getByText('No se pudo cargar')).toBeInTheDocument());
    expect(screen.queryByText('Todavía no hay asientos en esta cuenta para el período')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});

// La comprobación enlaza acá con la cuenta, la moneda y el rango que se venían
// mirando: sin leer la URL el link abriría un mayor en blanco.
describe('FinanceLedger — abre lo que dice la URL', () => {
  it('arranca en la cuenta, la moneda y el rango que llegaron por query', async () => {
    searchParams = new URLSearchParams({
      accountId: CUENTA.id,
      currency: 'USD',
      from: '2026-07-01',
      to: '2026-07-31',
    });
    render(<FinanceLedger />);

    await waitFor(() => expect(screen.getByText('2026-000001')).toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Cuenta' })).toHaveTextContent(
      '6900 Otros gastos operativos',
    );
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveTextContent('USD');
  });

  it('ignora una moneda que la contabilidad no maneja en vez de pedirla al backend', async () => {
    searchParams = new URLSearchParams({ accountId: CUENTA.id, currency: 'BRL' });
    render(<FinanceLedger />);

    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveTextContent('CRC');
  });
});
