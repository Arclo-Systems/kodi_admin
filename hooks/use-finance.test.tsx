import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFinanceLedger, useFinanceTrialBalance, financeReportCsvHref } from './use-finance';

// El mayor y la comprobación exigen parámetros que el backend rechaza con 400 si
// faltan (`accountId`/`currency`): la pantalla arranca sin ellos, así que la
// query tiene que quedarse quieta hasta que el usuario los elija. Con el hook
// mockeado eso no se puede afirmar — hace falta el hook real y el fetch espiado.
const fetchSpy = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const ok = (data: unknown) =>
  ({ ok: true, status: 200, json: async () => ({ data }) }) as unknown as Response;

beforeEach(() => {
  vi.clearAllMocks();
  fetchSpy.mockResolvedValue(ok({}));
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useFinanceLedger — no pide un reporte que el backend rechazaría', () => {
  it('sin cuenta no pega al BFF', async () => {
    const { result } = renderHook(
      () => useFinanceLedger({ accountId: '', currency: 'CRC', page: 1, pageSize: 50 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sin moneda tampoco', async () => {
    const { result } = renderHook(
      () => useFinanceLedger({ accountId: 'acc-1', currency: '', page: 1, pageSize: 50 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('con cuenta y moneda pide el rango con su paginación', async () => {
    renderHook(
      () =>
        useFinanceLedger({ accountId: 'acc-1', currency: 'CRC', page: 2, pageSize: 20 }),
      { wrapper },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      '/api/admin/finance/reports/ledger?accountId=acc-1&currency=CRC&page=2&pageSize=20',
    );
  });
});

describe('useFinanceTrialBalance — la moneda es obligatoria', () => {
  it('sin moneda no pega al BFF', async () => {
    const { result } = renderHook(() => useFinanceTrialBalance({ currency: '' }), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('financeReportCsvHref — los parámetros vacíos no viajan', () => {
  it('omite las fechas sin elegir', () => {
    expect(financeReportCsvHref('pnl', { from: undefined, to: '' })).toBe(
      '/api/admin/finance/reports/pnl.csv',
    );
  });

  it('arma el query del mayor con lo que sí hay', () => {
    expect(
      financeReportCsvHref('ledger', { accountId: 'a1', currency: 'USD', from: '2026-01-01' }),
    ).toBe('/api/admin/finance/reports/ledger.csv?accountId=a1&currency=USD&from=2026-01-01');
  });
});
