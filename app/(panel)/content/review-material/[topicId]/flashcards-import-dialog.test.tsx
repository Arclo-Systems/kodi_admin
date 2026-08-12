import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlashcardsImportDialog } from './flashcards-import-dialog';

// El flujo real pega al BFF: se intercepta ahí para probar de punta a punta
// selección → revisión → habilitación del CTA → import.
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function envelope(data: unknown): Response {
  return { ok: true, json: () => Promise.resolve({ data }) } as unknown as Response;
}

function renderDialog(): HTMLElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const { container } = render(
    <QueryClientProvider client={client}>
      <FlashcardsImportDialog topicId="topic-1" />
    </QueryClientProvider>,
  );
  return container;
}

const CSV = 'front,back\nuno,1\nsin dorso,\n';

function pickFile(): void {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('Falta el input de archivo');
  const file = new File([CSV], 'tarjetas.csv', { type: 'text/csv' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

function openDialog(): void {
  fireEvent.click(screen.getByRole('button', { name: /importar csv/i }));
}

describe('FlashcardsImportDialog', () => {
  it('con un archivo válido muestra la revisión y habilita el import', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      envelope({
        total: 2,
        validCount: 1,
        errors: [{ row: 2, message: 'dorso vacío' }],
        rows: [
          { row: 1, valid: true, error: null, front: 'uno', back: '1', order: 0 },
          { row: 2, valid: false, error: 'dorso vacío', front: 'sin dorso', back: '', order: 1 },
        ],
      }),
    );
    renderDialog();
    openDialog();

    const cta = screen.getByRole('button', { name: /^importar tarjetas$/i });
    expect(cta).toBeDisabled();

    pickFile();

    await waitFor(() => expect(screen.getByText('tarjetas.csv')).toBeInTheDocument());
    expect(screen.getByText(/1 de 2 filas/i)).toBeInTheDocument();
    // El reporte por fila es la razón de ser de la revisión.
    expect(screen.getByText(/fila 2: dorso vacío/i)).toBeInTheDocument();
    await waitFor(() => expect(cta).toBeEnabled());

    fetchMock.mockResolvedValueOnce(envelope({ inserted: 1, errors: [] }));
    fireEvent.click(cta);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('/api/admin/content/review-material/topics/topic-1/flashcards/bulk-import');
    expect(JSON.parse(String(init.body))).toEqual({ csv: CSV });
  });

  it('sin ninguna fila válida el import queda bloqueado', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      envelope({
        total: 1,
        validCount: 0,
        errors: [{ row: 1, message: 'frente vacío' }],
        rows: [{ row: 1, valid: false, error: 'frente vacío', front: '', back: 'x', order: 0 }],
      }),
    );
    renderDialog();
    openDialog();
    pickFile();

    await waitFor(() => expect(screen.getByText(/0 de 1 filas/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^importar tarjetas$/i })).toBeDisabled();
  });
});
