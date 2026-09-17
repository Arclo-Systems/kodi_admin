import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { REWARD_DEFAULTS, type RewardConfig } from '@/hooks/use-rewards-config';

// La Arena Rápida paga por tramos de puesto configurables acá (founder
// 2026-09-17): "1.º, 2.º, 3.º y resto" son cuatro filas. Los tres montos viejos
// de "Rápida al ganador" ya no existen.

const saveRewards = vi.fn();
let config: RewardConfig | null = null;

vi.mock('@/hooks/use-rewards-config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-rewards-config')>()),
  useRewardsConfig: () => ({ data: config, isLoading: false, isError: false }),
  useRewardsMutations: () => ({
    saveRewards: { mutateAsync: saveRewards, isPending: false },
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { RewardsConfigForm } from './rewards-config-form';

function seccionTramos(): HTMLElement {
  return screen.getByRole('group', { name: /Arena Rápida: premios por puesto/ });
}

function nth(els: HTMLElement[], i: number): HTMLElement {
  const el = els[i];
  if (!el) throw new Error(`no hay elemento ${i}`);
  return el;
}

function escribir(el: HTMLElement, value: string): void {
  fireEvent.change(el, { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
  saveRewards.mockResolvedValue({});
  config = {
    ...REWARD_DEFAULTS,
    id: 'rc1',
    country: 'CR',
    updatedAt: '2026-09-17T00:00:00.000Z',
  };
});

describe('RewardsConfigForm · tramos de la Rápida', () => {
  it('ya no muestra los montos fijos de "Rápida al ganador"', () => {
    render(<RewardsConfigForm country="CR" />);

    expect(screen.queryByLabelText('Rápida: Kolones')).toBeNull();
  });

  it('agregar el tramo del 2.º y guardar manda los tramos, no los montos viejos', async () => {
    render(<RewardsConfigForm country="CR" />);
    const tramos = seccionTramos();

    fireEvent.click(within(tramos).getByRole('button', { name: /Agregar tramo/ }));
    const desde = within(tramos).getAllByLabelText('Puesto desde');
    const hasta = within(tramos).getAllByLabelText('Puesto hasta');
    const kolones = within(tramos).getAllByLabelText('Kolones');
    escribir(nth(desde, 1), '2');
    escribir(nth(hasta, 1), '2');
    escribir(nth(kolones, 1), '20');

    fireEvent.click(screen.getByRole('button', { name: /Guardar recompensas/ }));

    await waitFor(() => expect(saveRewards).toHaveBeenCalled());
    const enviado = saveRewards.mock.calls[0]?.[0];
    expect(enviado.arenaRapidaPrizes).toEqual([
      { minRank: 1, maxRank: 1, kolones: 50, kokos: 30, xp: 0 },
      { minRank: 2, maxRank: 2, kolones: 20, kokos: 0, xp: 0 },
    ]);
    expect(enviado).not.toHaveProperty('arenaRapidaKolones');
  });

  it('dos tramos que se solapan no se guardan y lo dice', async () => {
    render(<RewardsConfigForm country="CR" />);
    const tramos = seccionTramos();

    fireEvent.click(within(tramos).getByRole('button', { name: /Agregar tramo/ }));
    escribir(nth(within(tramos).getAllByLabelText('Puesto desde'), 1), '1');
    escribir(nth(within(tramos).getAllByLabelText('Puesto hasta'), 1), '3');

    fireEvent.click(screen.getByRole('button', { name: /Guardar recompensas/ }));

    expect(await screen.findByText(/se solapan/)).toBeTruthy();
    expect(saveRewards).not.toHaveBeenCalled();
  });

  it('se pueden quitar todos los tramos: la Rápida no paga', async () => {
    render(<RewardsConfigForm country="CR" />);
    const tramos = seccionTramos();

    fireEvent.click(within(tramos).getByRole('button', { name: /Quitar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar recompensas/ }));

    await waitFor(() => expect(saveRewards).toHaveBeenCalled());
    expect(saveRewards.mock.calls[0]?.[0].arenaRapidaPrizes).toEqual([]);
  });
});
