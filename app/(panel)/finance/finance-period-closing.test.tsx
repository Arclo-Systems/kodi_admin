import type { ReactElement } from 'react';
import { render as rtlRender, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ApiError } from '@/lib/bff';
import type { AccountingPeriod } from '@/hooks/use-finance-tax';

let periods: AccountingPeriod[];
const close = vi.fn();
const reopen = vi.fn();
const refetch = vi.fn();

vi.mock('@/hooks/use-finance-tax', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance-tax')>()),
  usePeriods: () => ({ data: periods, isLoading: false, isError: false, refetch }),
  usePeriodMutations: () => ({
    close: { mutateAsync: close },
    reopen: { mutateAsync: reopen },
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { FinancePeriodClosing } from './finance-period-closing';

// El shell del panel monta el `TooltipProvider`; el tooltip de los bloqueos lo
// necesita para renderizar su trigger.
const render = (ui: ReactElement) => rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

const ABIERTO: AccountingPeriod = {
  id: 'p1',
  year: 2026,
  month: 9,
  period: '2026-09',
  status: 'OPEN',
  closedAt: null,
  closedBy: null,
  reopenedAt: null,
  reopenedBy: null,
  reopenReason: null,
  counts: { journalEntries: 12, unpostedEntries: 0, pendingPlayOrders: 0 },
  balances: [{ currency: 'CRC', debits: '500000.00', credits: '500000.00', difference: '0.00' }],
  balanced: true,
  blockers: [],
};

const DESCUADRE = {
  code: 'PERIOD_UNBALANCED',
  message: 'La comprobación de CRC no cuadra: faltan 33,33.',
  forceable: false,
};

const ORDENES_PENDIENTES = {
  code: 'PENDING_PLAY_ORDERS',
  message: 'Hay 3 órdenes de Google Play sin resolver con fecha en el mes.',
  forceable: true,
};

beforeEach(() => {
  periods = [ABIERTO];
  vi.clearAllMocks();
  close.mockResolvedValue({});
  reopen.mockResolvedValue({});
});

describe('FinancePeriodClosing — la lista', () => {
  it('muestra los conteos y que la comprobación cuadra', () => {
    render(<FinancePeriodClosing canWrite />);

    expect(screen.getByText('09/2026')).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Cuadra')).toBeInTheDocument();
    expect(screen.getByText('Nada. Se puede cerrar.')).toBeInTheDocument();
  });

  it('un descuadre nombra el monto que falta, no dice solo "no cuadra"', () => {
    periods = [
      {
        ...ABIERTO,
        balanced: false,
        balances: [
          { currency: 'CRC', debits: '500033.33', credits: '500000.00', difference: '33.33' },
        ],
        blockers: [DESCUADRE],
      },
    ];
    render(<FinancePeriodClosing canWrite />);

    expect(screen.getByText(/No cuadra: 33,33 CRC/)).toBeInTheDocument();
  });

  it('sin finance:write no ofrece cerrar ni reabrir', () => {
    render(<FinancePeriodClosing />);

    expect(screen.queryByRole('button', { name: /Cerrar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Reabrir/ })).toBeNull();
    // Ver el estado sí: es la respuesta a "¿puedo asentar con fecha de agosto?".
    expect(screen.getByText('Abierto')).toBeInTheDocument();
  });
});

describe('FinancePeriodClosing — el botón de cerrar y los bloqueos', () => {
  it('sin bloqueos, cerrar está habilitado', () => {
    render(<FinancePeriodClosing canWrite />);

    expect(screen.getByRole('button', { name: /Cerrar/ })).toBeEnabled();
  });

  it('un bloqueo NO forzable deshabilita el botón y se lista como texto en la fila', () => {
    periods = [{ ...ABIERTO, balanced: false, blockers: [DESCUADRE] }];
    render(<FinancePeriodClosing canWrite />);

    expect(screen.getByRole('button', { name: /Cerrar/ })).toBeDisabled();
    // El motivo NO vive solo en el tooltip: quien navega con teclado o lector
    // no puede apuntar con el mouse.
    expect(screen.getByText(DESCUADRE.message)).toBeInTheDocument();
  });

  it('con un descuadre Y órdenes pendientes sigue deshabilitado: force no salta el descuadre', () => {
    periods = [{ ...ABIERTO, balanced: false, blockers: [DESCUADRE, ORDENES_PENDIENTES] }];
    render(<FinancePeriodClosing canWrite />);

    expect(screen.getByRole('button', { name: /Cerrar/ })).toBeDisabled();
  });

  it('si el ÚNICO bloqueo son órdenes pendientes, ofrece cerrar de todos modos', () => {
    periods = [
      {
        ...ABIERTO,
        counts: { ...ABIERTO.counts, pendingPlayOrders: 3 },
        blockers: [ORDENES_PENDIENTES],
      },
    ];
    render(<FinancePeriodClosing canWrite />);

    expect(screen.getByRole('button', { name: /Cerrar de todos modos/ })).toBeEnabled();
  });
});

describe('FinancePeriodClosing — cerrar', () => {
  it('sin bloqueos manda force en false y sin motivo', async () => {
    render(<FinancePeriodClosing canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Cerrar/ }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar período' }));

    await waitFor(() =>
      expect(close).toHaveBeenCalledWith({ id: 'p1', force: false, reason: undefined }),
    );
  });

  it('forzar exige un motivo de al menos 10 caracteres antes de habilitar el botón', async () => {
    periods = [{ ...ABIERTO, blockers: [ORDENES_PENDIENTES] }];
    render(<FinancePeriodClosing canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Cerrar de todos modos/ }));

    const dialog = await screen.findByRole('dialog');
    const confirmar = within(dialog).getByRole('button', { name: /Cerrar de todos modos/ });
    expect(confirmar).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: 'corto' } });
    expect(confirmar).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText('Motivo'), {
      target: { value: 'Google no responde y vence el plazo fiscal.' },
    });
    fireEvent.click(confirmar);

    await waitFor(() =>
      expect(close).toHaveBeenCalledWith({
        id: 'p1',
        force: true,
        reason: 'Google no responde y vence el plazo fiscal.',
      }),
    );
  });

  it('el cierre secuencial se muestra con el mes que hay que cerrar primero', async () => {
    close.mockRejectedValue(
      new Error('Primero cerrá 2026-08: el período anterior sigue abierto.'),
    );
    render(<FinancePeriodClosing canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Cerrar/ }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar período' }));

    expect(await screen.findByText(/Primero cerrá 2026-08/)).toBeInTheDocument();
  });
});

describe('FinancePeriodClosing — reabrir', () => {
  const CERRADO: AccountingPeriod = {
    ...ABIERTO,
    status: 'CLOSED',
    closedAt: '2026-10-01T12:00:00.000Z',
    closedBy: 'u1',
  };

  beforeEach(() => {
    periods = [CERRADO];
  });

  it('exige el motivo antes de habilitar y lo manda sin force', async () => {
    render(<FinancePeriodClosing canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Reabrir/ }));

    const dialog = await screen.findByRole('dialog');
    const confirmar = within(dialog).getByRole('button', { name: 'Reabrir período' });
    expect(confirmar).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText('Motivo'), {
      target: { value: 'Llegó la factura de Railway con fecha de setiembre.' },
    });
    fireEvent.click(confirmar);

    await waitFor(() =>
      expect(reopen).toHaveBeenCalledWith({
        id: 'p1',
        reason: 'Llegó la factura de Railway con fecha de setiembre.',
        force: false,
      }),
    );
  });

  it('con una declaración presentada muestra el aviso del backend y ofrece forzar', async () => {
    reopen.mockRejectedValueOnce(
      new ApiError(
        'PERIOD_HAS_FILED_DECLARATION',
        'El mes tiene una declaración de IVA presentada: reabrirlo la deja desactualizada.',
        409,
      ),
    );
    render(<FinancePeriodClosing canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Reabrir/ }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Motivo'), {
      target: { value: 'Llegó la factura de Railway con fecha de setiembre.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reabrir período' }));

    // El aviso se lee, el diálogo NO se cierra, y el botón cambia de verbo.
    expect(await screen.findByText(/la deja desactualizada/)).toBeInTheDocument();
    const forzar = within(dialog).getByRole('button', { name: /Reabrir de todos modos/ });
    fireEvent.click(forzar);

    await waitFor(() => expect(reopen).toHaveBeenCalledTimes(2));
    expect(reopen.mock.calls[1]?.[0]).toMatchObject({ id: 'p1', force: true });
  });
});
