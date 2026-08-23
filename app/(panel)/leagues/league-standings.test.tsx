import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TreeModule } from '@/hooks/use-modules-tree';
import type {
  LeagueStandings,
  LeagueStandingsFilters,
  LeagueStandingRow,
} from '@/hooks/use-league-standings';

type StandingsState = {
  data: LeagueStandings | undefined;
  isLoading: boolean;
  error: Error | null;
};

let modules: TreeModule[];
let standingsState: StandingsState;
const standingsCall = vi.fn();

vi.mock('@/hooks/use-modules-tree', () => ({
  useModulesTree: () => ({ data: modules }),
}));
vi.mock('@/hooks/use-league-standings', () => ({
  useLeagueStandings: (filters: LeagueStandingsFilters, enabled: boolean) => {
    standingsCall(filters, enabled);
    return { ...standingsState, refetch: vi.fn() };
  },
}));

import { LeagueStandings as LeagueStandingsScreen, StandingsTable } from './league-standings';

function row(over: Partial<LeagueStandingRow> & { userId: string }): LeagueStandingRow {
  return {
    position: 1,
    displayName: 'Ana',
    showInRankings: true,
    xpThisCycle: 900,
    isFirstCycle: false,
    finalRank: null,
    outcome: null,
    updatedAt: '2026-08-20T00:00:00.000Z',
    ...over,
  };
}

function moduleWith(over: Partial<TreeModule> & { id: string }): TreeModule {
  return {
    country: 'CR',
    shortName: 'PNE',
    fullName: 'PNE Bachillerato',
    isActive: true,
    questionCount: 0,
    questionCounts: { draft: 0, review: 0, active: 0, inactive: 0 },
    examType: 'pne',
    examMode: 'per_subject',
    colorHex: '#408D99',
    iconUrl: null,
    characterUrl: null,
    version: '2026',
    hasAdmissionCutoffs: false,
    approvalThreshold: 70,
    noRepeatWindowQuestions: 0,
    duelCategorySource: 'subjects',
    duelCategoryCap: 8,
    examDurationMin: null,
    examQuestionCount: null,
    surpriseQuestionCount: 5,
    subjects: [],
    ...over,
  };
}

const NOOP = () => {};

describe('StandingsTable', () => {
  it('sin tabla elegida invita a elegir el módulo', () => {
    render(
      <StandingsTable ready={false} isLoading={false} error={null} items={[]} onRetry={NOOP} />,
    );

    expect(screen.getByText('Elegí un módulo')).toBeInTheDocument();
  });

  it('mientras carga muestra esqueletos, no la tabla vacía', () => {
    const { container } = render(
      <StandingsTable ready isLoading error={null} items={[]} onRetry={NOOP} />,
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByText('Todavía nadie compite en esta liga')).not.toBeInTheDocument();
  });

  it('una liga sin participantes lo dice', () => {
    render(<StandingsTable ready isLoading={false} error={null} items={[]} onRetry={NOOP} />);

    expect(screen.getByText('Todavía nadie compite en esta liga')).toBeInTheDocument();
  });

  // Un 403 de scope llega como mensaje del backend: hay que poder leerlo.
  it('el error muestra el mensaje del backend y deja reintentar', () => {
    const onRetry = vi.fn();
    render(
      <StandingsTable
        ready
        isLoading={false}
        error={new Error('No tenés permiso sobre ese país.')}
        items={[]}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('No tenés permiso sobre ese país.')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Reintentar' }).click();
    expect(onRetry).toHaveBeenCalled();
  });

  it('lista a los participantes en orden y marca a quien se oculta al público', () => {
    render(
      <StandingsTable
        ready
        isLoading={false}
        error={null}
        items={[
          row({ userId: 'u1', position: 1, displayName: 'Ana', xpThisCycle: 900 }),
          row({
            userId: 'u2',
            position: 2,
            displayName: 'Beto',
            xpThisCycle: 700,
            showInRankings: false,
          }),
        ]}
        onRetry={NOOP}
      />,
    );

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Ana');
    expect(rows[0]).toHaveTextContent('900');
    expect(rows[1]).toHaveTextContent('Beto');
    // El panel ve el nombre real; solo señala que la app lo esconde.
    expect(screen.getAllByText('Oculto al público')).toHaveLength(1);
  });

  // El desenlace solo existe con el ciclo cerrado: durante la semana va vacío.
  it('muestra el desenlace cuando el ciclo ya cerró', () => {
    render(
      <StandingsTable
        ready
        isLoading={false}
        error={null}
        items={[row({ userId: 'u1', outcome: 'promoted', finalRank: 1 })]}
        onRetry={NOOP}
      />,
    );

    expect(screen.getByText('Ascendió')).toBeInTheDocument();
  });
});

describe('LeagueStandings', () => {
  beforeEach(() => {
    standingsCall.mockClear();
    modules = [moduleWith({ id: 'mod-1' })];
    standingsState = { data: undefined, isLoading: false, error: null };
  });

  // Pedir la tabla sin módulo sería un 400 garantizado.
  it('no consulta hasta que haya un módulo elegido', () => {
    render(<LeagueStandingsScreen allowedCountries={['CR', 'GT']} />);

    expect(standingsCall).toHaveBeenCalledWith(
      { moduleId: '', country: 'CR', leagueLevel: 'aprendiz' },
      false,
    );
    // El placeholder del selector repite el texto: la fila vacía se identifica
    // por su descripción.
    expect(screen.getByText(/Cada módulo, país y liga/)).toBeInTheDocument();
  });

  // Un regional no debe poder pedir un país fuera de su scope: el backend lo
  // rechaza, pero tampoco se lo ofrecemos.
  it('arranca en el primer país que el admin tiene permitido', () => {
    render(<LeagueStandingsScreen allowedCountries={['GT']} />);

    expect(standingsCall).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'GT' }),
      false,
    );
  });
});
