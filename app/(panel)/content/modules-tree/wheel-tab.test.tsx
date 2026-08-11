import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TreeModule, TreeSubject, TreeTopic } from '@/hooks/use-modules-tree';

type TreeState = {
  data: TreeModule[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

let treeState: TreeState;
const updateSubject = vi.fn();
const updateTopic = vi.fn();

vi.mock('@/hooks/use-modules-tree', () => ({
  useModulesTree: () => ({ ...treeState, refetch: vi.fn() }),
}));
vi.mock('@/hooks/use-content-tree-mutations', () => ({
  useContentTreeMutations: () => ({
    updateSubject: { mutateAsync: updateSubject },
    updateTopic: { mutateAsync: updateTopic },
  }),
}));

import { WheelTab } from './wheel-tab';

const COUNTS = { draft: 0, review: 0, active: 0, inactive: 0 };

function topic(over: Partial<TreeTopic> & { id: string; name: string }): TreeTopic {
  return {
    order: 0,
    examWeight: null,
    questionCount: 0,
    questionCounts: COUNTS,
    colorHex: null,
    wheelAssetUrl: null,
    ...over,
  };
}

function subject(over: Partial<TreeSubject> & { id: string; name: string }): TreeSubject {
  return {
    order: 0,
    questionCount: 0,
    questionCounts: COUNTS,
    colorHex: '#408D99',
    assetUrl: null,
    wheelAssetUrl: null,
    topics: [],
    ...over,
  };
}

function moduleWith(over: Partial<TreeModule>): TreeModule {
  return {
    id: 'mod-1',
    country: 'CR',
    shortName: 'PNE',
    fullName: 'PNE Bachillerato',
    isActive: true,
    questionCount: 0,
    questionCounts: COUNTS,
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
    duelCategoryCap: 6,
    examDurationMin: null,
    examQuestionCount: null,
    surpriseQuestionCount: 5,
    subjects: [],
    ...over,
  };
}

function renderTab(over: { canWrite?: boolean } = {}) {
  return render(
    <WheelTab moduleId="mod-1" canWrite={over.canWrite ?? true} onGoToModuleForm={vi.fn()} />,
  );
}

function sectorFills(container: HTMLElement): (string | null)[] {
  return Array.from(container.querySelectorAll('path[data-slot="wheel-sector"]')).map((p) =>
    p.getAttribute('fill'),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  updateSubject.mockResolvedValue(undefined);
  updateTopic.mockResolvedValue(undefined);
  treeState = {
    data: [
      moduleWith({
        subjects: [
          subject({ id: 'sub-1', name: 'Español', colorHex: '#F47C6B' }),
          subject({ id: 'sub-2', name: 'Matemática', colorHex: '#5DB7E8' }),
        ],
      }),
    ],
    isLoading: false,
    isError: false,
    error: null,
  };
});

describe('WheelTab', () => {
  it('muestra esqueletos mientras carga el árbol', () => {
    treeState = { data: [], isLoading: true, isError: false, error: null };
    const { container } = renderTab();
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('muestra el error del backend con reintento', () => {
    treeState = {
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('Se cayó la red'),
    };
    renderTab();
    expect(screen.getByText('No se pudo cargar la ruleta')).toBeInTheDocument();
    expect(screen.getByText('Se cayó la red')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('avisa cuando el módulo no tiene sectores todavía', () => {
    treeState.data = [moduleWith({ subjects: [] })];
    renderTab();
    expect(screen.getByText('Este módulo todavía no tiene materias')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Crear la primera materia/ })).toBeInTheDocument();
  });

  it('dibuja un sector por materia y avisa que el orden se baraja', () => {
    const { container } = renderTab();
    expect(sectorFills(container)).toEqual(['#F47C6B', '#5DB7E8', '#B79AE8']);
    expect(screen.getByText(/En la partida el orden se baraja/)).toBeInTheDocument();
    expect(screen.getByText(/máximo/)).toBeInTheDocument();
  });

  it('editar el color repinta la réplica sin guardar nada', () => {
    treeState.data = [
      moduleWith({ subjects: [subject({ id: 'sub-1', name: 'Español', colorHex: '#F47C6B' })] }),
    ];
    const { container } = renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Morado' }));
    expect(sectorFills(container)[0]).toBe('#B79AE8');
    expect(updateSubject).not.toHaveBeenCalled();
  });

  it('guarda solo los sectores tocados, contra el endpoint de la materia', async () => {
    renderTab();
    const espanol = screen.getByText('Español').closest('div[class*="rounded-xl"]');
    fireEvent.click(within(espanol as HTMLElement).getByRole('button', { name: 'Morado' }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    await waitFor(() => expect(updateSubject).toHaveBeenCalledTimes(1));
    expect(updateSubject).toHaveBeenCalledWith({
      id: 'sub-1',
      colorHex: '#B79AE8',
      wheelAssetUrl: null,
    });
    expect(updateTopic).not.toHaveBeenCalled();
  });

  it('con tablero por temas guarda contra el endpoint del tema', async () => {
    treeState.data = [
      moduleWith({
        duelCategorySource: 'topics',
        subjects: [
          subject({
            id: 'sub-1',
            name: 'PAA UCR',
            topics: [topic({ id: 'top-1', name: 'Razonamiento verbal' })],
          }),
        ],
      }),
    ];
    renderTab();
    expect(screen.getByText('Razonamiento verbal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lima' }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    await waitFor(() => expect(updateTopic).toHaveBeenCalledTimes(1));
    expect(updateTopic).toHaveBeenCalledWith({
      id: 'top-1',
      colorHex: '#9BCB6C',
      wheelAssetUrl: null,
    });
  });

  it('sin permiso de escritura no deja editar ni guardar', () => {
    renderTab({ canWrite: false });
    expect(screen.queryByRole('button', { name: /Guardar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Morado' })).not.toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
  });
});
