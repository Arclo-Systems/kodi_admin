import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionActions } from './question-actions';
import type { QuestionDetail } from '@/hooks/use-questions';

vi.mock('@/hooks/use-questions', () => ({
  useQuestionAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

const borrador = {
  id: 'q1',
  status: 'draft',
  text: 'Enunciado',
  options: [],
  correctOptionId: 'a',
} as unknown as QuestionDetail;

// Incidente 2026-07-30: "Enviar a revisión" solo cambia el estado, no guarda el
// formulario. Con una imagen recién insertada y sin guardar, la pregunta pasaba
// a revisión sin la imagen y nadie se enteraba.
describe('QuestionActions — no deja cambiar de estado con edición pendiente', () => {
  it('bloquea "Enviar a revisión" si hay cambios sin guardar', () => {
    render(<QuestionActions question={borrador} role="admin" hasUnsavedChanges />);

    expect(screen.getByRole('button', { name: /enviar a revisión/i })).toBeDisabled();
    expect(screen.getByText(/cambios sin guardar/i)).toBeInTheDocument();
  });

  it('lo habilita cuando no hay nada pendiente', () => {
    render(<QuestionActions question={borrador} role="admin" hasUnsavedChanges={false} />);

    expect(screen.getByRole('button', { name: /enviar a revisión/i })).toBeEnabled();
    expect(screen.queryByText(/cambios sin guardar/i)).not.toBeInTheDocument();
  });
});
