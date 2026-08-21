import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IncidenciasPanel } from '../incidencias/incidencias-panel';
import type { Incidents } from '@/hooks/use-store-monetization';

const resolveIncident = vi.fn().mockResolvedValue({ resolved: true });
const assignModules = vi.fn().mockResolvedValue({ status: 'granted', moduleIds: [] });

vi.mock('@/hooks/use-store-monetization', async (original) => ({
  ...(await original<typeof import('@/hooks/use-store-monetization')>()),
  useStoreMutations: () => ({
    resolveIncident: { mutateAsync: resolveIncident },
    assignModules: { mutateAsync: assignModules },
    releaseReservation: { mutateAsync: vi.fn() },
    reprocessEvent: { mutateAsync: vi.fn() },
    retryDlq: { mutateAsync: vi.fn() },
  }),
}));

const USER = '11111111-1111-4111-8111-111111111111';
const MODULO = '22222222-2222-4222-8222-222222222222';

const data: Incidents = {
  items: [
    {
      id: 'e1',
      messageId: 'm1',
      eventType: 'subscription:4',
      status: 'pending_module_selection',
      attempts: 1,
      lastError: null,
      receivedAt: '2026-08-20T10:00:00.000Z',
      processedAt: null,
      latencyMs: null,
      purchaseTokenSha: 'abc123',
      payload: { version: '1.0' },
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
  negativeKokos: [
    {
      id: 'u1',
      email: 'deudor@kodi.test',
      displayName: 'Deudor',
      country: 'CR',
      kokosBalance: -120,
    },
  ],
  negativeKokosTotal: 1,
  counts: {
    unmapped: 2,
    unresolved: 1,
    pending_module_selection: 1,
    founder_without_reservation: 0,
    kokos_negativo: 1,
  },
};

const paint = (props: Partial<Parameters<typeof IncidenciasPanel>[0]> = {}) =>
  render(
    <TooltipProvider>
      <IncidenciasPanel data={data} {...props} />
    </TooltipProvider>,
  );

describe('IncidenciasPanel', () => {
  it('lista los cinco tipos de incidencia de la spec', () => {
    paint();

    for (const tipo of [
      'unmapped',
      'unresolved',
      'pending_module_selection',
      'founder_without_reservation',
      'kokos_negativo',
    ]) {
      expect(screen.getByText(new RegExp(tipo, 'i'))).toBeInTheDocument();
    }
  });

  // El saldo negativo por clawback no tiene otra superficie: el backend solo alerta
  // por log. Sin esta tabla, un usuario con deuda de Kokos es invisible para soporte.
  it('muestra los saldos de Kokos en negativo con su usuario', () => {
    paint();

    expect(screen.getByText('deudor@kodi.test')).toBeInTheDocument();
    expect(screen.getByText('-120')).toBeInTheDocument();
  });

  it('las tarjetas de conteo filtran la tabla por ese estado', () => {
    const onStatusChange = vi.fn();
    paint({ onStatusChange });

    fireEvent.click(screen.getByText('SKU sin mapear'));
    expect(onStatusChange).toHaveBeenCalledWith('unmapped');
  });

  it('ofrece asignar módulos solo sobre una incidencia que los espera', () => {
    const { rerender } = paint();
    expect(screen.getByRole('button', { name: /asignar módulos/i })).toBeInTheDocument();

    rerender(
      <TooltipProvider>
        <IncidenciasPanel
          data={{ ...data, items: [{ ...data.items[0]!, status: 'unmapped' }] }}
        />
      </TooltipProvider>,
    );
    expect(screen.queryByRole('button', { name: /asignar módulos/i })).not.toBeInTheDocument();
  });

  // El camino que concede acceso pagado: si el payload sale mal armado, se le dan
  // módulos al usuario equivocado o de a uno cuando el pack cobrado eran tres.
  it('asignar módulos manda el usuario, los módulos separados y el motivo', async () => {
    paint();

    fireEvent.click(screen.getByRole('button', { name: /asignar módulos/i }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(dialogo.querySelector('#assign-user')!, {
      target: { value: USER },
    });
    fireEvent.change(dialogo.querySelector('#assign-modules')!, {
      target: { value: `${MODULO}, ${MODULO.replace('2222222', '3333333')}` },
    });
    fireEvent.change(dialogo.querySelector('#assign-reason')!, {
      target: { value: 'soporte: ticket 4711' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^asignar$/i }));

    await waitFor(() =>
      expect(assignModules).toHaveBeenCalledWith({
        id: 'e1',
        userId: USER,
        moduleIds: [MODULO, MODULO.replace('2222222', '3333333')],
        reason: 'soporte: ticket 4711',
      }),
    );
  });

  // M11: sin motivo no hay fila de auditoría que explique por qué soporte tocó una
  // compra ajena, así que el diálogo no deja confirmar hasta que se escriba uno.
  it('no cierra una incidencia sin motivo', async () => {
    paint();

    fireEvent.click(screen.getByRole('button', { name: /marcar resuelto/i }));
    await screen.findByText(/cerrar la incidencia/i);

    const confirmar = screen
      .getAllByRole('button', { name: /marcar resuelto/i })
      .find((button) => button.hasAttribute('disabled'));

    expect(confirmar).toBeDefined();
    expect(resolveIncident).not.toHaveBeenCalled();
  });
});
