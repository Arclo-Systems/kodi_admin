import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MissionTemplate } from '@/hooks/use-missions';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const create = vi.fn();
const update = vi.fn();
let detail: MissionTemplate | undefined;

vi.mock('@/hooks/use-missions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-missions')>()),
  useMissionTemplate: () => ({ data: detail, isLoading: false }),
  useMissionTemplateMutations: () => ({
    create: { mutateAsync: create },
    update: { mutateAsync: update },
  }),
}));

import { MissionForm } from './mission-form';

const ALL_PLANS = ['free', 'basico', 'plus', 'pro'] as const;

function template(over: Partial<MissionTemplate> = {}): MissionTemplate {
  return {
    id: 't1',
    type: 'win_duel',
    cadence: 'daily',
    title: 'Ganá un duelo',
    description: 'Ganá una Partida Kodi',
    target: 1,
    xpReward: 10,
    kokosReward: 0,
    kolonesReward: 0,
    country: null,
    iconUrl: null,
    icon: null,
    plans: [...ALL_PLANS],
    isActive: true,
    createdBy: null,
    updatedBy: null,
    updatedAt: '2026-08-19T00:00:00.000Z',
    ...over,
  };
}

function type(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillRequired(): void {
  type('Título', 'Ganá un duelo');
  type('Descripción', 'Ganá una Partida Kodi');
  type('XP', '10');
}

beforeEach(() => {
  vi.clearAllMocks();
  detail = undefined;
  create.mockResolvedValue('t1');
  update.mockResolvedValue(undefined);
});

describe('MissionForm — planes alcanzados', () => {
  it('el alta arranca con los cuatro planes marcados y los manda', async () => {
    render(<MissionForm />);

    for (const label of ['Free', 'Básico', 'Plus', 'Pro']) {
      expect(screen.getByLabelText(label)).toBeChecked();
    }

    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /crear template/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ plans: ['free', 'basico', 'plus', 'pro'] }),
    );
  });

  it('destildar planes deja solo los elegidos', async () => {
    render(<MissionForm />);

    fireEvent.click(screen.getByLabelText('Free'));
    fireEvent.click(screen.getByLabelText('Básico'));
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /crear template/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ plans: ['plus', 'pro'] }),
    );
  });

  it('sin ningún plan no guarda y lo dice', async () => {
    render(<MissionForm />);

    for (const label of ['Free', 'Básico', 'Plus', 'Pro']) {
      fireEvent.click(screen.getByLabelText(label));
    }
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /crear template/i }));

    expect(await screen.findByText('Elegí al menos un plan')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('un template sin planes (caché vieja) se edita como abierto a todos', () => {
    const sinPlanes: Partial<MissionTemplate> = template();
    delete sinPlanes.plans;
    detail = sinPlanes as MissionTemplate;
    render(<MissionForm templateId="t1" />);

    for (const label of ['Free', 'Básico', 'Plus', 'Pro']) {
      expect(screen.getByLabelText(label)).toBeChecked();
    }
  });

  it('la edición precarga los planes vigentes y los devuelve al guardar', async () => {
    detail = template({ plans: ['plus', 'pro'] });
    render(<MissionForm templateId="t1" />);

    expect(screen.getByLabelText('Plus')).toBeChecked();
    expect(screen.getByLabelText('Pro')).toBeChecked();
    expect(screen.getByLabelText('Free')).not.toBeChecked();
    expect(screen.getByLabelText('Básico')).not.toBeChecked();

    fireEvent.click(screen.getByLabelText('Free'));
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 't1',
        input: expect.objectContaining({ plans: ['free', 'plus', 'pro'] }),
      }),
    );
  });
});
