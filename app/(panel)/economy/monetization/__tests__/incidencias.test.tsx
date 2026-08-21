import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IncidenciasPanel } from '../incidencias/incidencias-panel';
import type { Incidents } from '@/hooks/use-store-monetization';

const resolveIncident = vi.fn().mockResolvedValue({});
const assignModules = vi.fn().mockResolvedValue({});

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
  counts: {
    unmapped: 2,
    unresolved: 1,
    pending_module_selection: 1,
    founder_without_reservation: 0,
    kokos_negativo: 1,
  },
};

describe('IncidenciasPanel', () => {
  it('lista los cinco tipos de incidencia de la spec', () => {
    render(<IncidenciasPanel data={data} />);

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
    render(<IncidenciasPanel data={data} />);

    expect(screen.getByText('deudor@kodi.test')).toBeInTheDocument();
    expect(screen.getByText('-120')).toBeInTheDocument();
  });

  it('ofrece asignar módulos solo sobre una incidencia que los espera', () => {
    const { rerender } = render(<IncidenciasPanel data={data} />);
    expect(screen.getByRole('button', { name: /asignar módulos/i })).toBeInTheDocument();

    rerender(
      <IncidenciasPanel
        data={{ ...data, items: [{ ...data.items[0]!, status: 'unmapped' }] }}
      />,
    );
    expect(screen.queryByRole('button', { name: /asignar módulos/i })).not.toBeInTheDocument();
  });

  // M11: sin motivo no hay fila de auditoría que explique por qué soporte tocó una
  // compra ajena, así que el diálogo no deja confirmar hasta que se escriba uno.
  it('no cierra una incidencia sin motivo', async () => {
    render(<IncidenciasPanel data={data} />);

    fireEvent.click(screen.getByRole('button', { name: /marcar resuelto/i }));
    await screen.findByText(/cerrar la incidencia/i);

    const confirmar = screen
      .getAllByRole('button', { name: /marcar resuelto/i })
      .find((button) => button.hasAttribute('disabled'));

    expect(confirmar).toBeDefined();
    expect(resolveIncident).not.toHaveBeenCalled();
  });
});
