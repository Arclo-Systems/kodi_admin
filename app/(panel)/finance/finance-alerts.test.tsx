import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  AlertEvaluation,
  AlertPage,
  AlertRulePage,
  FinanceAlert,
} from '@/hooks/use-finance-planning';

let rules: AlertRulePage;
let alerts: AlertPage;
const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();
const acknowledge = vi.fn();
const evaluate = vi.fn();
const refetch = vi.fn();

vi.mock('@/hooks/use-finance-planning', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance-planning')>()),
  useFinanceAlertRules: () => ({
    data: rules,
    isLoading: false,
    isError: false,
    refetch,
  }),
  useFinanceAlerts: () => ({ data: alerts, isLoading: false, isError: false, refetch }),
  useFinanceAlertRuleMutations: () => ({
    create: { mutateAsync: create },
    update: { mutateAsync: update },
    remove: { mutateAsync: remove },
  }),
  useFinanceAlertActions: () => ({
    acknowledge: { mutateAsync: acknowledge },
    evaluate: { mutateAsync: evaluate, isPending: false },
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { FinanceAlerts } from './finance-alerts';

const RULES: AlertRulePage = {
  items: [
    {
      id: 'r1',
      kind: 'RUNWAY_BELOW_MONTHS',
      threshold: '6.00',
      thresholdUnit: 'months',
      currency: 'CRC',
      isActive: true,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 100,
};

const ALERTA: FinanceAlert = {
  id: 'al1',
  ruleId: 'r1',
  kind: 'UNPOSTED_PLAY_ORDERS',
  currency: null,
  threshold: '0.00',
  firedOn: '2026-09-15',
  firedAt: '2026-09-15T13:30:12.000Z',
  message: 'Hay 2 orden(es) de Google Play con plata cobrada y sin asentar.',
  context: { unpostedOrders: 2 },
  acknowledgedAt: null,
  acknowledgedBy: null,
};

const EVALUACION: AlertEvaluation = {
  evaluatedOn: '2026-09-15',
  evaluated: 3,
  fired: 1,
  deduped: 1,
  skipped: [
    {
      ruleId: 'r2',
      kind: 'BUDGET_OVERRUN_PERCENT',
      reason: 'No hay presupuesto ACTIVE de 2026-09 en CRC: no hay contra qué comparar.',
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  rules = RULES;
  alerts = { items: [ALERTA], total: 1, page: 1, pageSize: 20 };
  create.mockResolvedValue({});
  update.mockResolvedValue({});
  acknowledge.mockResolvedValue({});
  evaluate.mockResolvedValue(EVALUACION);
});

describe('FinanceAlerts — las reglas dicen qué unidad es su umbral', () => {
  it('pinta el umbral con su unidad y la moneda de la regla', () => {
    render(<FinanceAlerts canWrite />);

    const row = screen.getByText('Pista de caja por debajo de').closest('tr');
    expect(within(row as HTMLElement).getByText('6,00 meses')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('CRC')).toBeInTheDocument();
  });
});

describe('FinanceAlerts — crear una regla', () => {
  it('manda tipo, umbral como string y moneda cuando la regla mira plata', async () => {
    render(<FinanceAlerts canWrite />);

    fireEvent.click(screen.getByRole('button', { name: /Nueva regla/ }));
    fireEvent.change(await screen.findByLabelText('Umbral'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear regla/ }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith({
      kind: 'RUNWAY_BELOW_MONTHS',
      threshold: '6',
      currency: 'CRC',
      isActive: true,
    });
  });

  it('la regla que cuenta órdenes no pide moneda ni la manda: el backend la prohíbe', async () => {
    render(<FinanceAlerts canWrite />);

    fireEvent.click(screen.getByRole('button', { name: /Nueva regla/ }));
    fireEvent.click(await screen.findByRole('combobox', { name: 'Tipo' }));
    fireEvent.click(await screen.findByRole('option', { name: /Órdenes de Play sin asentar/ }));

    expect(screen.queryByRole('combobox', { name: 'Moneda' })).toBeNull();

    // El cero es un umbral legítimo acá: "más de 0 órdenes sin asentar".
    fireEvent.change(screen.getByLabelText('Umbral'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear regla/ }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith({
      kind: 'UNPOSTED_PLAY_ORDERS',
      threshold: '0',
      isActive: true,
    });
  });
});

describe('FinanceAlerts — acusar recibo de una alerta', () => {
  it('marca la alerta como vista', async () => {
    render(<FinanceAlerts canWrite />);

    expect(screen.getByText(/Hay 2 orden\(es\) de Google Play/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como vista' }));

    await waitFor(() => expect(acknowledge).toHaveBeenCalledWith('al1'));
  });

  it('una alerta ya vista no vuelve a ofrecer el botón', () => {
    alerts = {
      ...alerts,
      items: [{ ...ALERTA, acknowledgedAt: '2026-09-15T14:00:00.000Z', acknowledgedBy: 'u1' }],
    };
    render(<FinanceAlerts canWrite />);

    expect(screen.queryByRole('button', { name: 'Marcar como vista' })).toBeNull();
    expect(screen.getByText('Vista')).toBeInTheDocument();
  });
});

describe('FinanceAlerts — evaluar a mano', () => {
  it('resume qué disparó y NOMBRA las reglas que no pudieron decidir', async () => {
    render(<FinanceAlerts canWrite />);

    fireEvent.click(screen.getByRole('button', { name: /Evaluar ahora/ }));

    expect(await screen.findByText(/3 regla\(s\) evaluadas el 2026-09-15/)).toBeInTheDocument();
    expect(screen.getByText(/No hay presupuesto ACTIVE de 2026-09/)).toBeInTheDocument();
  });
});

describe('FinanceAlerts — sin permiso de escritura', () => {
  it('no ofrece crear, evaluar ni marcar', () => {
    render(<FinanceAlerts />);

    expect(screen.queryByRole('button', { name: /Nueva regla/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Evaluar ahora/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Marcar como vista' })).toBeNull();
  });
});
