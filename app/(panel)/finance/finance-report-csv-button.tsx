'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DownloadIcon } from 'lucide-react';
import { financeReportCsvHref, type FinanceReport } from '@/hooks/use-finance';
import { downloadReport } from '@/lib/download-report';
import { Button } from '@/components/ui/button';

const FALLBACK_NAME: Record<FinanceReport, string> = {
  ledger: 'mayor.csv',
  'trial-balance': 'comprobacion.csv',
  pnl: 'resultados.csv',
};

// Un solo botón para los tres reportes: el archivo se pide con fetch (no con
// `<a download>`) para que un 413 o una sesión caída se vean como mensaje y no
// terminen guardados en el disco con extensión `.csv`.
export function FinanceReportCsvButton({
  report,
  params,
  className,
}: {
  report: FinanceReport;
  params: Record<string, string | number | undefined>;
  className?: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function download(): Promise<void> {
    setDownloading(true);
    try {
      await downloadReport(financeReportCsvHref(report, params), FALLBACK_NAME[report]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo bajar el archivo');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={downloading}
      onClick={() => void download()}
    >
      <DownloadIcon className="size-4" />
      {downloading ? 'Generando…' : 'Exportar CSV'}
    </Button>
  );
}
