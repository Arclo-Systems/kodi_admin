import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TreeModule } from '@/hooks/use-modules-tree';
import type { ModeRanking, ModeRankingFilters, ModeRankingRow } from '@/hooks/use-mode-ranking';

type RankingState = {
  data: ModeRanking | undefined;
  isLoading: boolean;
  error: Error | null;
};

let modules: TreeModule[];
let rankingState: RankingState;
const rankingCall = vi.fn();

vi.mock('@/hooks/use-modules-tree', () => ({
  useModulesTree: () => ({ data: modules }),
}));
vi.mock('@/hooks/use-mode-ranking', () => ({
  useModeRanking: (mode: string, filters: ModeRankingFilters, enabled: boolean) => {
    rankingCall(mode, filters, enabled);
    return { ...rankingState, refetch: vi.fn() };
  },
}));

import { QuickModesRanking, RankingTable } from './quick-modes-ranking';

function row(over: Partial<ModeRankingRow> & { userId: string }): ModeRankingRow {
  return {
    position: 1,
    displayName: 'Ana',
    showInRankings: true,
    bestScore: 900,
    bestCombo: 12,
    updatedAt: '2026-08-09T00:00:00.000Z',
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

describe('RankingTable', () => {
  it('sin tabla elegida invita a elegir el módulo', () => {
    render(
      <RankingTable
        ready={false}
        needsExam={false}
        isLoading={false}
        error={null}
        items={[]}
        onRetry={NOOP}
      />,
    );

    expect(screen.getByText('Elegí un módulo')).toBeInTheDocument();
  });

  // En admisión cada examen tiene su propia tabla: pedir el módulo no alcanza.
  it('en un módulo de admisión pide el examen', () => {
    render(
      <RankingTable
        ready={false}
        needsExam
        isLoading={false}
        error={null}
        items={[]}
        onRetry={NOOP}
      />,
    );

    expect(screen.getByText('Elegí el examen')).toBeInTheDocument();
  });

  it('mientras carga muestra esqueletos, no la tabla vacía', () => {
    const { container } = render(
      <RankingTable ready isLoading needsExam={false} error={null} items={[]} onRetry={NOOP} />,
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByText('Todavía nadie marcó un récord acá')).not.toBeInTheDocument();
  });

  it('una tabla sin récords lo dice', () => {
    render(
      <RankingTable
        ready
        needsExam={false}
        isLoading={false}
        error={null}
        items={[]}
        onRetry={NOOP}
      />,
    );

    expect(screen.getByText('Todavía nadie marcó un récord acá')).toBeInTheDocument();
  });

  // Un 403 de scope llega como mensaje del backend: hay que poder leerlo.
  it('el error muestra el mensaje del backend y deja reintentar', () => {
    const onRetry = vi.fn();
    render(
      <RankingTable
        ready
        needsExam={false}
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

  it('lista los récords en orden y marca a quien se oculta al público', () => {
    render(
      <RankingTable
        ready
        needsExam={false}
        isLoading={false}
        error={null}
        items={[
          row({ userId: 'u1', position: 1, displayName: 'Ana', bestScore: 900, bestCombo: 12 }),
          row({
            userId: 'u2',
            position: 2,
            displayName: 'Beto',
            bestScore: 800,
            bestCombo: 9,
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
});

describe('QuickModesRanking', () => {
  beforeEach(() => {
    rankingCall.mockClear();
    modules = [moduleWith({ id: 'mod-1' })];
    rankingState = { data: undefined, isLoading: false, error: null };
  });

  // Pedir el ranking sin módulo sería un 400 garantizado.
  it('no consulta hasta que haya un módulo elegido', () => {
    render(<QuickModesRanking allowedCountries={['CR', 'GT']} />);

    expect(rankingCall).toHaveBeenCalledWith(
      'contrarreloj',
      { moduleId: '', country: 'CR', examSubjectId: null },
      false,
    );
    // El placeholder del selector repite el texto: la fila vacía se identifica
    // por su descripción.
    expect(screen.getByText(/Cada modo, módulo, país y examen/)).toBeInTheDocument();
  });

  // Un regional no debe poder pedir un país fuera de su scope: el backend lo
  // rechaza, pero tampoco se lo ofrecemos.
  it('arranca en el primer país que el admin tiene permitido', () => {
    render(<QuickModesRanking allowedCountries={['GT']} />);

    expect(rankingCall).toHaveBeenCalledWith(
      'contrarreloj',
      expect.objectContaining({ country: 'GT' }),
      false,
    );
  });
});
