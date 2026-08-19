import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { MissionTemplate } from '@/hooks/use-missions';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
// El diálogo de refresh trae sus propios hooks de red; acá solo importa la grilla.
vi.mock('./refresh-config-form', () => ({ RefreshConfigDialog: () => null }));

const template: MissionTemplate = {
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
  plans: ['plus', 'pro'],
  isActive: true,
  createdBy: null,
  updatedBy: null,
  updatedAt: '2026-08-19T00:00:00.000Z',
};

vi.mock('@/hooks/use-missions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-missions')>()),
  useMissionTemplates: () => ({
    data: { items: [template], total: 1, page: 1, pageSize: 20 },
    isLoading: false,
  }),
}));

import { MissionsTable } from './missions-table';

describe('MissionsTable', () => {
  it('muestra los planes alcanzados como badges', () => {
    render(<MissionsTable />);

    const fila = screen.getByRole('row', { name: /ganá un duelo/i });
    expect(fila).toHaveTextContent('Plus');
    expect(fila).toHaveTextContent('Pro');
    expect(fila).not.toHaveTextContent('Free');
  });
});
