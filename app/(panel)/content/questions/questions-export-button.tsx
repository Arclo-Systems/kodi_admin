'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadReport } from '@/lib/download-report';
import type { QuestionListQuery } from '@/hooks/use-questions';
import { questionsExportQueryString } from '@/lib/question-list-query-url';

const EXPORT_PATH = '/api/admin/content/questions/export';
const FALLBACK_NAME = 'preguntas.csv';

export function questionsExportHref(query: QuestionListQuery): string {
  const qs = questionsExportQueryString(query);
  return qs ? `${EXPORT_PATH}?${qs}` : EXPORT_PATH;
}

// El archivo se pide con fetch y no con `<a download>`: con la sesión caída el
// browser guardaría el JSON del 401 en el disco con extensión `.csv` y el error
// aparecería recién al abrirlo en Excel.
export function QuestionsExportButton({
  query,
  total,
  loading,
}: {
  query: QuestionListQuery;
  total: number;
  loading: boolean;
}) {
  const [downloading, setDownloading] = useState(false);

  async function download(): Promise<void> {
    setDownloading(true);
    try {
      await downloadReport(questionsExportHref(query), FALLBACK_NAME);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo bajar el archivo');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      // Mientras el listado carga todavía no se sabe si hay filas: arrancar
      // habilitado haría parpadear el botón hasta deshabilitarse en el vacío.
      disabled={loading || total === 0 || downloading}
      onClick={() => void download()}
    >
      <DownloadIcon className="size-4" />
      {downloading ? 'Generando…' : 'Exportar CSV'}
    </Button>
  );
}
