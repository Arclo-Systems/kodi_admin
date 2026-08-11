import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TreeModule, TreeSubject, TreeTopic } from '@/hooks/use-modules-tree';

type TreeState = {
  data: TreeModule[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

type CrownState = {
  data: { crownAssetUrl: string | null; crownColorHex: string | null } | null;
  isLoading: boolean;
};

let treeState: TreeState;
let crownState: CrownState;
const updateSubject = vi.fn();
const updateTopic = vi.fn();
const updateCrown = vi.fn();
const wheelConfigEnabled = vi.fn();

vi.mock('@/hooks/use-modules-tree', () => ({
  useModulesTree: () => ({ ...treeState, refetch: vi.fn() }),
}));
vi.mock('@/hooks/use-content-tree-mutations', () => ({
  useContentTreeMutations: () => ({
    updateSubject: { mutateAsync: updateSubject },
    updateTopic: { mutateAsync: updateTopic },
  }),
}));
vi.mock('@/hooks/use-wheel-config', () => ({
  WHEEL_CROWN_ASSET_ENDPOINT: '/api/admin/game/wheel-config/upload-asset',
  useWheelConfig: (enabled: boolean) => {
    wheelConfigEnabled(enabled);
    return crownState;
  },
  useUpdateWheelConfig: () => ({ mutateAsync: updateCrown, isPending: false }),
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

// La corona es admin-only: por defecto se renderiza sin ella para que los atajos de paleta del
// bloque no compitan con los de los sectores.
function renderTab(over: { canWrite?: boolean; canEditCrown?: boolean } = {}) {
  return render(
    <WheelTab
      moduleId="mod-1"
      canWrite={over.canWrite ?? true}
      canEditCrown={over.canEditCrown ?? false}
      onGoToModuleForm={vi.fn()}
    />,
  );
}

function crownBlock(container: HTMLElement): HTMLElement {
  const block = container.querySelector('[data-slot="wheel-crown"]');
  if (!block) throw new Error('no hay bloque de corona');
  return block as HTMLElement;
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
  updateCrown.mockResolvedValue(undefined);
  crownState = { data: null, isLoading: false };
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

  describe('corona', () => {
    it('sin rol admin no muestra el bloque ni pide la config global', () => {
      const { container } = renderTab();
      expect(container.querySelector('[data-slot="wheel-crown"]')).toBeNull();
      expect(wheelConfigEnabled).toHaveBeenCalledWith(false);
    });

    it('avisa que la corona aplica a todos los módulos', () => {
      renderTab({ canEditCrown: true });
      expect(screen.getByText('Aplica a todos los módulos')).toBeInTheDocument();
    });

    it('pinta la corona con la config global y refleja el cambio en vivo sin guardar', () => {
      crownState = {
        data: { crownAssetUrl: null, crownColorHex: '#123456' },
        isLoading: false,
      };
      const { container } = renderTab({ canEditCrown: true });
      expect(sectorFills(container).at(-1)).toBe('#123456');

      fireEvent.click(within(crownBlock(container)).getByRole('button', { name: 'Dorado' }));
      expect(sectorFills(container).at(-1)).toBe('#E3B23C');
      expect(updateCrown).not.toHaveBeenCalled();
    });

    it('guarda la corona contra su propio endpoint, sin tocar los sectores', async () => {
      const { container } = renderTab({ canEditCrown: true });
      fireEvent.click(within(crownBlock(container)).getByRole('button', { name: 'Morado' }));
      fireEvent.click(screen.getByRole('button', { name: /Guardar corona/ }));

      await waitFor(() => expect(updateCrown).toHaveBeenCalledTimes(1));
      expect(updateCrown).toHaveBeenCalledWith({
        crownAssetUrl: null,
        crownColorHex: '#B79AE8',
      });
      expect(updateSubject).not.toHaveBeenCalled();
    });

    it('sin cambios no deja guardar la corona', () => {
      renderTab({ canEditCrown: true });
      expect(screen.getByRole('button', { name: /Guardar corona/ })).toBeDisabled();
    });
  });
});
