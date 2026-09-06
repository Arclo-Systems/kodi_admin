import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useFinanceAccountMutations,
  useFinanceAccounts,
  useFinanceBalanceSheet,
  useFinanceCashFlow,
  useFinanceLedger,
  useFinanceTrialBalance,
  usePlayOrderCounts,
  financeReportCsvHref,
  type FinanceAccount,
} from './use-finance';

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

// El backend responde 400 con las dos juntas ("son dos reportes distintos") y
// también sin ninguna: la query se queda quieta en vez de gastar el viaje.
describe('useFinanceBalanceSheet — moneda XOR consolidado', () => {
  it('sin ninguna de las dos no pega al BFF', async () => {
    const { result } = renderHook(() => useFinanceBalanceSheet({}), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('con las dos juntas tampoco', async () => {
    const { result } = renderHook(
      () => useFinanceBalanceSheet({ currency: 'CRC', consolidateTo: 'USD' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('consolidando manda consolidateTo y NO currency', async () => {
    renderHook(() => useFinanceBalanceSheet({ consolidateTo: 'USD' }), { wrapper });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      '/api/admin/finance/reports/balance-sheet?consolidateTo=USD',
    );
  });
});

describe('useFinanceCashFlow — la moneda es obligatoria', () => {
  it('sin moneda no pega al BFF', async () => {
    const { result } = renderHook(() => useFinanceCashFlow({ currency: '' }), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// Antes eran SIETE consultas (la misma lista con `pageSize: 1`, leyendo solo
// `total`), que además podían llegar desparejas y dejar el semáforo contando un
// rango distinto al de la tabla.
describe('usePlayOrderCounts — el semáforo sale de un solo request', () => {
  it('pide el resumen agregado una vez, con el rango que se está mirando', async () => {
    fetchSpy.mockResolvedValue(
      ok({ counts: { PENDING: 0, POSTED: 12, FAILED: 2 }, needsAttention: 2 }),
    );

    const { result } = renderHook(
      () => usePlayOrderCounts({ from: '2026-09-01T00:00:00.000Z' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.counts.POSTED).toBe(12));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      '/api/admin/finance/play-orders/summary?from=2026-09-01T00%3A00%3A00.000Z',
    );
    expect(result.current.needsAttention).toBe(2);
  });

  it('un estado que el backend no nombró queda indefinido, no en cero', async () => {
    fetchSpy.mockResolvedValue(ok({ counts: { POSTED: 1 }, needsAttention: 0 }));

    const { result } = renderHook(() => usePlayOrderCounts({}), { wrapper });

    await waitFor(() => expect(result.current.counts.POSTED).toBe(1));
    expect(result.current.counts.SKIPPED).toBeUndefined();
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

// ─── Reordenar el plan de cuentas ─────────────────────────────────────────────
// El reorden manda un PATCH por hermana corrida, en serie, así que la tanda
// puede fallar POR LA MITAD: las primeras ya se escribieron y las últimas no.
// Ese es el caso que la caché no puede resolver sola.

function account(over: Partial<FinanceAccount>): FinanceAccount {
  return {
    id: 'a',
    code: '1101',
    name: 'Caja colones',
    type: 'ASSET',
    currency: 'CRC',
    parentId: 'acc-1100',
    isActive: true,
    allowsManualEntry: true,
    isSystem: false,
    sortOrder: 0,
    parentCode: '1100',
    depth: 1,
    ancestorCodes: ['1000', '1100'],
    ...over,
  };
}

const PLAN: FinanceAccount[] = [
  account({ id: 'a1', code: '1101', sortOrder: 0 }),
  account({ id: 'a2', code: '1102', name: 'Caja dólares', sortOrder: 1 }),
  account({ id: 'a3', code: '1111', name: 'Banco colones', sortOrder: 2 }),
];

// Un cliente COMPARTIDO por los dos hooks del test: sin él, la lista y la
// mutación viven en cachés distintas y el optimista no se puede observar.
function sharedWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

/** Los `sortOrder` del plan tal como los ve la pantalla, por id. */
const ordenDe = (data: FinanceAccount[] | undefined) =>
  Object.fromEntries((data ?? []).map((a) => [a.id, a.sortOrder]));

describe('useFinanceAccountMutations.reorder — optimista, con vuelta atrás y refetch', () => {
  const patchOk = () => ({ ok: true, status: 200, json: async () => ({}) }) as unknown as Response;

  function setup() {
    const Wrapper = sharedWrapper();
    return renderHook(
      () => ({ plan: useFinanceAccounts(), mutations: useFinanceAccountMutations() }),
      { wrapper: Wrapper },
    );
  }

  it('reordena antes de que vuelva el primer PATCH', async () => {
    fetchSpy.mockResolvedValue(ok(PLAN));
    const { result } = setup();
    await waitFor(() => expect(result.current.plan.data).toHaveLength(3));

    // El PATCH queda colgado: lo único que puede haber movido el orden es el
    // optimista.
    let resolver!: () => void;
    fetchSpy.mockImplementation(
      () => new Promise<Response>((resolve) => (resolver = () => resolve(patchOk()))),
    );
    void result.current.mutations.reorder.mutateAsync([
      { id: 'a2', sortOrder: 0 },
      { id: 'a1', sortOrder: 1 },
    ]);

    await waitFor(() => expect(ordenDe(result.current.plan.data).a2).toBe(0));
    expect(ordenDe(result.current.plan.data).a1).toBe(1);
    resolver();
  });

  it('si la tanda falla por la mitad, deshace el optimista y vuelve a pedir el plan', async () => {
    fetchSpy.mockResolvedValue(ok(PLAN));
    const { result } = setup();
    await waitFor(() => expect(result.current.plan.data).toHaveLength(3));

    // Tres PATCH: el tercero revienta. Los dos primeros YA se escribieron, así
    // que ni el orden viejo ni el que se pidió son ciertos: el único estado
    // consistente es el que devuelva el servidor.
    const servidor: FinanceAccount[] = [
      account({ id: 'a1', code: '1101', sortOrder: 1 }),
      account({ id: 'a2', code: '1102', name: 'Caja dólares', sortOrder: 0 }),
      account({ id: 'a3', code: '1111', name: 'Banco colones', sortOrder: 2 }),
    ];
    let patches = 0;
    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method !== 'PATCH') return ok(servidor);
      patches += 1;
      if (patches === 3) {
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: { code: 'ACCOUNT_NOT_FOUND', message: 'No existe' } }),
        } as unknown as Response;
      }
      return patchOk();
    });

    await expect(
      result.current.mutations.reorder.mutateAsync([
        { id: 'a2', sortOrder: 0 },
        { id: 'a1', sortOrder: 1 },
        { id: 'a3', sortOrder: 2 },
      ]),
    ).rejects.toThrow('No existe');

    // El error no deja el plan con el orden que el usuario pidió: se invalida
    // SIEMPRE y la pantalla termina mostrando lo que de verdad quedó escrito.
    await waitFor(() => expect(ordenDe(result.current.plan.data)).toEqual({ a1: 1, a2: 0, a3: 2 }));
    expect(patches).toBe(3);
  });

  it('un reorden que sale bien también refresca el plan', async () => {
    fetchSpy.mockResolvedValue(ok(PLAN));
    const { result } = setup();
    await waitFor(() => expect(result.current.plan.data).toHaveLength(3));

    const guardado: FinanceAccount[] = [
      account({ id: 'a1', code: '1101', sortOrder: 1 }),
      account({ id: 'a2', code: '1102', name: 'Caja dólares', sortOrder: 0 }),
      account({ id: 'a3', code: '1111', name: 'Banco colones', sortOrder: 2 }),
    ];
    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'PATCH' ? patchOk() : ok(guardado),
    );

    await result.current.mutations.reorder.mutateAsync([
      { id: 'a2', sortOrder: 0 },
      { id: 'a1', sortOrder: 1 },
    ]);

    await waitFor(() => expect(ordenDe(result.current.plan.data)).toEqual({ a1: 1, a2: 0, a3: 2 }));
  });
});
