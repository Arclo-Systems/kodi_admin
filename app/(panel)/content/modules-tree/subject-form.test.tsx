import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TreeModule, TreeSubject } from '@/hooks/use-modules-tree';

const createSubject = vi.fn();
const updateSubject = vi.fn();
const deleteSubject = vi.fn();

vi.mock('@/hooks/use-content-tree-mutations', () => ({
  useContentTreeMutations: () => ({
    createSubject: { mutateAsync: createSubject },
    updateSubject: { mutateAsync: updateSubject },
    deleteSubject: { mutateAsync: deleteSubject },
  }),
}));

import { SubjectForm } from './subject-form';

const EMPTY_COUNTS = { draft: 0, review: 0, active: 0, inactive: 0 };

function subject(over: Partial<TreeSubject> = {}): TreeSubject {
  return {
    id: 's1',
    name: 'TEC',
    order: 0,
    questionCount: 0,
    questionCounts: EMPTY_COUNTS,
    colorHex: '#5DB7E8',
    assetUrl: null,
    wheelAssetUrl: null,
    examQuestionCount: null,
    examDurationMin: null,
    topics: [],
    ...over,
  };
}

function tree(
  examMode: TreeModule['examMode'],
  subjects: TreeSubject[] = [subject()],
): TreeModule[] {
  return [
    {
      id: 'm1',
      country: 'CR',
      shortName: 'PAA',
      fullName: 'Prueba de Aptitud Académica',
      isActive: true,
      questionCount: 0,
      questionCounts: EMPTY_COUNTS,
      examType: 'admision_paa',
      examMode,
      colorHex: '#F47C6B',
      iconUrl: null,
      characterUrl: null,
      version: '1.0.0',
      hasAdmissionCutoffs: false,
      approvalThreshold: 70,
      noRepeatWindowQuestions: 50,
      duelCategorySource: 'subjects',
      duelCategoryCap: 6,
      examDurationMin: 180,
      examQuestionCount: 100,
      surpriseQuestionCount: 5,
      subjects,
    },
  ];
}

function type(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
  createSubject.mockResolvedValue(undefined);
  updateSubject.mockResolvedValue(undefined);
});

describe('SubjectForm — config de examen (adenda §10 + ajuste 2026-08-19)', () => {
  // La materia ES el examen en los dos modos: PAA y PEN.
  it.each(['admission', 'per_subject'] as const)(
    'en %s el alta manda los dos campos como NÚMEROS',
    async (examMode) => {
      render(
        <SubjectForm
          view={{ kind: 'new-subject', moduleId: 'm1' }}
          tree={tree(examMode, [])}
          onDone={vi.fn()}
        />,
      );

      type('Nombre', 'TEC');
      type('Nombre corto', 'TEC');
      type('Cantidad de preguntas del examen', '60');
      type('Duración del examen en minutos', '120');
      fireEvent.click(screen.getByRole('button', { name: /crear/i }));

      await waitFor(() => expect(createSubject).toHaveBeenCalledTimes(1));
      expect(createSubject).toHaveBeenCalledWith(
        expect.objectContaining({ examQuestionCount: 60, examDurationMin: 120 }),
      );
    },
  );

  it('vacíos viajan en null (= usar los del módulo)', async () => {
    render(
      <SubjectForm
        view={{ kind: 'new-subject', moduleId: 'm1' }}
        tree={tree('admission', [])}
        onDone={vi.fn()}
      />,
    );

    type('Nombre', 'UCR');
    type('Nombre corto', 'UCR');
    fireEvent.click(screen.getByRole('button', { name: /crear/i }));

    await waitFor(() => expect(createSubject).toHaveBeenCalledTimes(1));
    expect(createSubject).toHaveBeenCalledWith(
      expect.objectContaining({ examQuestionCount: null, examDurationMin: null }),
    );
  });

  it('la edición precarga lo vigente y lo devuelve al guardar', async () => {
    render(
      <SubjectForm
        view={{ kind: 'subject', id: 's1', moduleId: 'm1' }}
        tree={tree('admission', [
          subject({ examQuestionCount: 60, examDurationMin: 120 }),
        ])}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Cantidad de preguntas del examen')).toHaveValue(60);
    expect(screen.getByLabelText('Duración del examen en minutos')).toHaveValue(120);

    type('Cantidad de preguntas del examen', '80');
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(updateSubject).toHaveBeenCalledTimes(1));
    expect(updateSubject).toHaveBeenCalledWith(
      expect.objectContaining({ examQuestionCount: 80, examDurationMin: 120 }),
    );
  });

  it('en simple (COSEVI) los campos NO se muestran: el examen ES el módulo', () => {
    render(
      <SubjectForm
        view={{ kind: 'subject', id: 's1', moduleId: 'm1' }}
        tree={tree('simple')}
        onDone={vi.fn()}
      />,
    );

    expect(
      screen.queryByLabelText('Cantidad de preguntas del examen'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Duración del examen en minutos'),
    ).not.toBeInTheDocument();
  });

  it('en per_subject SÍ se muestran (la materia es el examen en PEN)', () => {
    render(
      <SubjectForm
        view={{ kind: 'subject', id: 's1', moduleId: 'm1' }}
        tree={tree('per_subject')}
        onDone={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText('Cantidad de preguntas del examen'),
    ).toBeInTheDocument();
  });

  it('en simple el guardado NO manda los campos (no los borra)', async () => {
    render(
      <SubjectForm
        view={{ kind: 'subject', id: 's1', moduleId: 'm1' }}
        tree={tree('simple')}
        onDone={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(updateSubject).toHaveBeenCalledTimes(1));
    // `noUncheckedIndexedAccess`: el índice es opcional, así que se afirma que
    // hubo payload antes de mirarlo (si no, el `not.toHaveProperty` pasaría solo).
    const sent = updateSubject.mock.lastCall?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(sent).toBeDefined();
    expect(sent).not.toHaveProperty('examQuestionCount');
    expect(sent).not.toHaveProperty('examDurationMin');
  });
});
