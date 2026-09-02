import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BotsTab } from '@/app/(panel)/bots/bots-tab';
import type { BotRow } from '@/hooks/use-bots';

// Columna "Módulos" de la lista de Bots (campaña 2026-09-02): el panel
// ocultaba esta dimensión — un módulo nuevo sin bots era invisible hasta que
// fallaba el matchmaking y confundió al founder.
const BOTS: BotRow[] = [
  {
    id: 'bot-1',
    displayName: 'Bot Uno',
    country: 'CR',
    accountStatus: 'active',
    botConfig: {
      accuracy: 0.7,
      isActive: true,
      template: { difficulty: 'medio', name: 'Medio' },
    },
    modules: [
      { id: 'm1', shortName: 'PAA' },
      { id: 'm2', shortName: 'PEN' },
    ],
  },
  {
    id: 'bot-2',
    displayName: 'Bot Dos',
    country: 'CR',
    accountStatus: 'active',
    botConfig: {
      accuracy: 0.6,
      isActive: true,
      template: { difficulty: 'medio', name: 'Medio' },
    },
    modules: [],
  },
];

vi.mock('@/hooks/use-bots', () => ({
  useBots: () => ({
    data: { items: BOTS, total: BOTS.length },
    isLoading: false,
    isError: false,
  }),
  useTemplates: () => ({ data: [] }),
  useBotMutations: () => ({ update: { mutate: vi.fn(), isPending: false } }),
}));

vi.mock('./generate-bots-button', () => ({
  GenerateBotsButton: () => null,
}));

describe('BotsTab — columna Módulos', () => {
  it('muestra los módulos inscritos de cada bot y delata al que no tiene ninguno', () => {
    render(<BotsTab canWrite={false} />);

    expect(screen.getByText('Módulos')).toBeInTheDocument();
    expect(screen.getByText('PAA')).toBeInTheDocument();
    expect(screen.getByText('PEN')).toBeInTheDocument();
    // Sin módulos = alerta visible, no un guion silencioso.
    expect(screen.getByText('Sin módulos')).toBeInTheDocument();
  });
});
