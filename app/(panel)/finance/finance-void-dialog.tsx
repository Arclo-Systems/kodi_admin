'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Mismos límites que `VoidFinanceEntrySchema` en el backend. El motivo viaja a la
// descripción del asiento de reversión y a la fila de auditoría: pasarse de 300
// es un 400 que se puede evitar mientras se escribe.
export const VOID_REASON_MIN = 5;
export const VOID_REASON_MAX = 300;

// No reusa `ConfirmDialog` porque ese no deja acotar el motivo ni mostrar cuánto
// queda, y es un componente compartido por medio panel.
export function FinanceVoidDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // El motivo de una anulación no se arrastra a la siguiente: se limpia al
  // cerrar, que es el único camino de salida del diálogo.
  function close(): void {
    setReason('');
    setError(null);
    onOpenChange(false);
  }

  const trimmed = reason.trim();
  const canConfirm = trimmed.length >= VOID_REASON_MIN && !submitting;

  async function confirm(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anular el movimiento');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular movimiento</DialogTitle>
          <DialogDescription>
            El movimiento queda anulado y su asiento se revierte con uno nuevo fechado hoy. El
            motivo queda en el libro.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="void-reason">Motivo</FieldLabel>
          <Textarea
            id="void-reason"
            value={reason}
            maxLength={VOID_REASON_MAX}
            rows={3}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Mínimo ${VOID_REASON_MIN} caracteres`}
          />
          <FieldDescription>
            {reason.length}/{VOID_REASON_MAX}
          </FieldDescription>
        </Field>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={!canConfirm} onClick={confirm}>
            {submitting ? 'Anulando…' : 'Anular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
