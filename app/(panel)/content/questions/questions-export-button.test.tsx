import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_QUESTION_LIST_QUERY } from '@/lib/question-list-query-url';

const downloadReport = vi.fn();
const toastError = vi.fn();

vi.mock('@/lib/download-report', () => ({
  downloadReport: (url: string, name: string) => downloadReport(url, name),
}));
vi.mock('sonner', () => ({ toast: { error: (msg: string) => toastError(msg) } }));

import { QuestionsExportButton } from './questions-export-button';

const EXPORTAR = /exportar csv/i;
const boton = () => screen.getByRole('button', { name: /exportar csv|generando/i });

describe('QuestionsExportButton', () => {
  beforeEach(() => {
    downloadReport.mockReset().mockResolvedValue(undefined);
    toastError.mockReset();
  });

  it('pide el archivo con fetch (downloadReport), no con un enlace de descarga', async () => {
    render(
      <QuestionsExportButton
        query={{ status: 'review', moduleId: 'm1', page: 3, pageSize: 50 }}
        total={120}
        loading={false}
      />,
    );
    // Un `<a download>` guardaría el JSON de un 401 como si fuera el CSV.
    expect(screen.queryByRole('link', { name: EXPORTAR })).not.toBeInTheDocument();

    fireEvent.click(boton());
    await waitFor(() =>
      expect(downloadReport).toHaveBeenCalledWith(
        '/api/admin/content/questions/export?moduleId=m1&status=review',
        'preguntas.csv',
      ),
    );
  });

  it('sin filtros baja el banco entero', async () => {
    render(
      <QuestionsExportButton query={DEFAULT_QUESTION_LIST_QUERY} total={7} loading={false} />,
    );
    fireEvent.click(boton());
    await waitFor(() =>
      expect(downloadReport).toHaveBeenCalledWith(
        '/api/admin/content/questions/export',
        'preguntas.csv',
      ),
    );
  });

  it('con el listado vacío queda deshabilitado', () => {
    render(
      <QuestionsExportButton query={DEFAULT_QUESTION_LIST_QUERY} total={0} loading={false} />,
    );
    expect(boton()).toBeDisabled();
  });

  it('mientras el listado carga arranca deshabilitado (sin parpadeo)', () => {
    render(<QuestionsExportButton query={DEFAULT_QUESTION_LIST_QUERY} total={0} loading />);
    expect(boton()).toBeDisabled();
  });

  it('el error del backend sale como toast y no como archivo', async () => {
    downloadReport.mockRejectedValue(new Error('Sesión expirada'));
    render(
      <QuestionsExportButton query={DEFAULT_QUESTION_LIST_QUERY} total={3} loading={false} />,
    );
    fireEvent.click(boton());
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Sesión expirada'));
    expect(boton()).not.toBeDisabled();
  });
});
