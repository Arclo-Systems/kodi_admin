import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuestionForm } from './question-form';
import type { QuestionDetail } from '@/hooks/use-questions';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/use-modules-tree', () => ({ useModulesTree: () => ({ data: [] }) }));
// El preview monta KaTeX/Mermaid; acá solo importa qué llega (o no) al BFF.
vi.mock('./question-preview', () => ({ QuestionPreview: () => null }));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const baseQuestion = (over: Partial<QuestionDetail>): QuestionDetail =>
  ({
    id: 'q1',
    moduleId: 'm1',
    subjectId: 's1',
    topicId: 't1',
    text: 'Enunciado',
    options: [
      { id: 'a', text: 'uno' },
      { id: 'b', text: 'dos' },
    ],
    correctOptionId: 'a',
    difficulty: 'medium',
    isDemoPool: false,
    explanation: null,
    ...over,
  }) as unknown as QuestionDetail;

function renderForm(initial: QuestionDetail): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <QuestionForm mode="edit" questionId="q1" initial={initial} />
    </QueryClientProvider>,
  );
}

function save(): void {
  fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
}

// Contrato de contenido rico #24: el panel sanitiza el HTML en el preview y la app lo imprime
// literal. Guardarlo sería publicar algo que el autor nunca vio.
describe('QuestionForm — contenido que la app no puede dibujar', () => {
  beforeEach(() => fetchMock.mockReset());

  it('no guarda con HTML crudo en una opción y explica qué usar', async () => {
    renderForm(
      baseQuestion({
        options: [
          { id: 'a', text: 'Una línea<br>y otra' },
          { id: 'b', text: 'dos' },
        ],
      }),
    );
    save();

    await waitFor(() =>
      expect(screen.getByText(/El HTML no se muestra en la app/)).toBeInTheDocument(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no guarda con un SVG que carga una imagen externa', async () => {
    renderForm(
      baseQuestion({
        text: 'Figura:\n```svg\n<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.test/p.png"/></svg>\n```',
      }),
    );
    save();

    await waitFor(() =>
      expect(
        screen.getByText('El SVG no puede cargar imágenes externas ni datos embebidos'),
      ).toBeInTheDocument(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no guarda con un SVG que trae un script', async () => {
    renderForm(
      baseQuestion({
        explanation:
          'Mirá:\n```svg\n<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>\n```',
      }),
    );
    save();

    await waitFor(() =>
      expect(
        screen.getByText(
          'El SVG contiene contenido no permitido (scripts, eventos o elementos externos)',
        ),
      ).toBeInTheDocument(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('guarda el Markdown válido con una figura sin recursos externos', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: {} }) });
    renderForm(
      baseQuestion({
        text: 'Área de $x^2$\n```svg\n<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5"/></svg>\n```',
      }),
    );
    save();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/El HTML no se muestra en la app/)).not.toBeInTheDocument();
  });
});
