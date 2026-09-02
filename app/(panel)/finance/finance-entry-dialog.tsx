'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PaperclipIcon, PencilIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { KIND_LABELS, type FinanceEntry } from '@/hooks/use-finance';
import { openSignedAsset } from '@/lib/signed-asset';
import { StatusBadge } from '@/lib/status-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border/60 flex items-start justify-between gap-4 border-b py-2.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-semibold">{children}</dd>
    </div>
  );
}

export function FinanceEntryDialog({
  entry,
  onOpenChange,
  fmtDate,
  fmtAmount,
}: {
  entry: FinanceEntry | null;
  onOpenChange: (open: boolean) => void;
  fmtDate: (iso: string) => string;
  fmtAmount: (entry: FinanceEntry) => string;
}) {
  function verComprobante(): void {
    if (!entry) return;
    openSignedAsset(`/api/admin/finance/entries/${entry.id}/receipt-url`).catch((e) =>
      toast.error(e instanceof Error ? e.message : 'No se pudo abrir el comprobante'),
    );
  }

  return (
    <Dialog open={!!entry} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle>{entry.vendor ?? 'Movimiento'}</DialogTitle>
              <DialogDescription>
                {KIND_LABELS[entry.kind]} de {entry.categoryName} · {fmtDate(entry.date)}
              </DialogDescription>
            </DialogHeader>

            <dl className="min-w-0">
              <Dato label="Tipo">
                {entry.kind === 'income' ? (
                  <StatusBadge tone="success" icon={TrendingUpIcon} label={KIND_LABELS.income} />
                ) : (
                  <StatusBadge tone="warning" icon={TrendingDownIcon} label={KIND_LABELS.expense} />
                )}
              </Dato>
              <Dato label="Categoría">{entry.categoryName}</Dato>
              <Dato label="Monto">
                <span className="tabular-nums">{fmtAmount(entry)}</span>
              </Dato>
              <Dato label="Fecha">{fmtDate(entry.date)}</Dato>
              <Dato label="Proveedor / fuente">
                {entry.vendor ?? <span className="text-muted-foreground">—</span>}
              </Dato>
              <Dato label="Comprobante">
                {entry.hasReceipt ? (
                  <Button variant="ghost" size="sm" onClick={verComprobante}>
                    <PaperclipIcon className="size-4" />
                    Ver
                  </Button>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Dato>
              <Dato label="Nota">
                {entry.note ? (
                  // La nota se carga en un textarea, así que sus saltos de línea son del autor.
                  <span className="whitespace-pre-line">{entry.note}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Dato>
            </dl>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cerrar</Button>
              </DialogClose>
              <Button asChild>
                <Link href={`/finance/movimientos/${entry.id}/edit`}>
                  <PencilIcon className="size-4" />
                  Editar
                </Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
