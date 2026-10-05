import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { UserMission } from '@/hooks/use-missions';

const MISION: UserMission = {
  id: 'm1',
  type: 'complete_practice_session',
  date: '2026-09-27T00:00:00.000Z',
  targetCount: 10,
  progress: 3,
  completed: false,
  completedAt: null,
  xpReward: 10,
  kokosReward: 0,
  kolonesReward: 0,
};

vi.mock('@/hooks/use-missions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-missions')>()),
  useUserMissions: (_code: string, enabled: boolean) => ({
    data: enabled ? [MISION] : undefined,
    isLoading: false,
    isError: false,
  }),
  useMissionIntervention: () => ({
    complete: { mutateAsync: vi.fn() },
    reset: { mutateAsync: vi.fn() },
    substitute: { mutateAsync: vi.fn() },
  }),
}));

import { MissionIntervention } from './mission-intervention';

describe('MissionIntervention', () => {
  it('el día de la misión es un día civil: no se corre al día anterior', () => {
    // `DailyMission.date` es `@db.Date` (medianoche UTC). En hora de CR eso cae el 26.
    render(<MissionIntervention />);
    fireEvent.change(screen.getByLabelText('Código de amigo'), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByText('27/9/2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reiniciar/ }));
    expect(screen.getByText(/— 27\/9\/2026\. Requiere un motivo/)).toBeInTheDocument();
  });
});
