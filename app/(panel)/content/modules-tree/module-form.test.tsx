import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TreeModule } from '@/hooks/use-modules-tree';

const createModule = vi.fn();
const updateModule = vi.fn();
const toggleModule = vi.fn();
const deleteModule = vi.fn();

vi.mock('@/hooks/use-content-tree-mutations', () => ({
  useContentTreeMutations: () => ({
    createModule: { mutateAsync: createModule },
    updateModule: { mutateAsync: updateModule },
    toggleModule: { mutate: toggleModule, mutateAsync: toggleModule },
    deleteModule: { mutateAsync: deleteModule },
  }),
}));

import { ModuleForm } from './module-form';

const EMPTY_TREE: TreeModule[] = [];

function renderNewModuleForm() {
  return render(
    <ModuleForm view={{ kind: 'new-module' }} tree={EMPTY_TREE} canWriteModules onDone={vi.fn()} />,
  );
}

function type(name: string, value: string): void {
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
  createModule.mockResolvedValue(undefined);
});

describe('ModuleForm — alta', () => {
  it('el alta manda duración y conteo de preguntas', async () => {
    renderNewModuleForm();

    type('Nombre corto', 'COSEVI Moto');
    type('Nombre completo', 'Licencia A1');
    type('Duración del examen en minutos', '60');
    type('Cantidad de preguntas del examen', '40');
    fireEvent.click(screen.getByRole('button', { name: /crear|guardar/i }));

    await waitFor(() => expect(createModule).toHaveBeenCalledTimes(1));
    expect(createModule).toHaveBeenCalledWith(
      expect.objectContaining({ examDurationMin: 60, examQuestionCount: 40 }),
    );
  });

  it('el alta sin duración ni conteo los manda en null', async () => {
    renderNewModuleForm();

    type('Nombre corto', 'PEN');
    type('Nombre completo', 'PEN Secundaria');
    fireEvent.click(screen.getByRole('button', { name: /crear|guardar/i }));

    await waitFor(() => expect(createModule).toHaveBeenCalledTimes(1));
    expect(createModule).toHaveBeenCalledWith(
      expect.objectContaining({ examDurationMin: null, examQuestionCount: null }),
    );
  });

  it('los campos solo-edición NO aparecen en el alta', () => {
    renderNewModuleForm();

    expect(screen.queryByText('Nota mínima')).not.toBeInTheDocument();
    expect(screen.queryByText('Examen sorpresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Partida Kodi')).not.toBeInTheDocument();
  });
});
