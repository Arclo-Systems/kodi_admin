'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PaperclipIcon, PencilIcon } from 'lucide-react';
import { type FinanceEntry } from '@/hooks/use-finance';
import { MOVEMENT_TYPE_LABELS } from './finance-format';
import { openSignedAsset } from '@/lib/signed-asset';
import { EntryStatusBadge, MovementTypeBadge } from './finance-entry-badges';
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
                {MOVEMENT_TYPE_LABELS[entry.type]} de {entry.categoryName} · {fmtDate(entry.date)}
              </DialogDescription>
            </DialogHeader>

            <dl className="min-w-0">
              <Dato label="Tipo">
                <MovementTypeBadge type={entry.type} />
              </Dato>
              <Dato label="Estado">
                <EntryStatusBadge status={entry.status} />
              </Dato>
              {entry.status === 'VOIDED' && (
                <>
                  <Dato label="Motivo de la anulación">
                    {entry.voidReason ? (
                      <span className="whitespace-pre-line">{entry.voidReason}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Dato>
                  <Dato label="Anulado el">
                    {entry.voidedAt ? (
                      fmtDate(entry.voidedAt)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Dato>
                  <Dato label="Anulado por">
                    {/* El nombre viaja null si ese admin ya no existe: ahí queda el
                        uuid, que es lo único con lo que se puede cruzar el audit log. */}
                    {entry.voidedByName ?? (
                      entry.voidedBy ? (
                        <span className="font-mono text-xs">{entry.voidedBy}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    )}
                  </Dato>
                </>
              )}
              <Dato label="Categoría">{entry.categoryName}</Dato>
              <Dato label="Monto">
                <span className="tabular-nums">{fmtAmount(entry)}</span>
              </Dato>
              <Dato label="Fecha">{fmtDate(entry.date)}</Dato>
              {/* Explica por qué "Anular" está deshabilitado en los movimientos
                  cargados antes del backfill contable. */}
              <Dato label="Asiento">
                {entry.journalEntryId ? (
                  'Contabilizado'
                ) : (
                  <span className="text-muted-foreground">Pendiente de contabilizar</span>
                )}
              </Dato>
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
                  {entry.status === 'VOIDED' ? 'Abrir' : 'Editar'}
                </Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
