'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export type TwoFaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: string;
  onVerified: (token: string) => void | Promise<void>;
  // Ruta BACKEND que emite el código (ej `/v1/admin/admins/${id}/request-2fa`).
  // El componente la proxyea vía `/api/auth/request-2fa?forward=`.
  requestEndpoint: string;
};

export function TwoFaDialog({ open, onOpenChange, action, onVerified, requestEndpoint }: TwoFaDialogProps) {
  const [code, setCode] = useState('');
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset(): void {
    setCode('');
    setRequested(false);
    setError(null);
  }

  async function requestCode(): Promise<void> {
    setError(null);
    const res = await fetch(`/api/auth/request-2fa?forward=${encodeURIComponent(requestEndpoint)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      setError('No se pudo enviar el código');
      return;
    }
    setRequested(true);
  }

  async function verify(): Promise<void> {
    if (!/^\d{6}$/.test(code)) {
      setError('El código debe ser de 6 dígitos');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onVerified(code);
      onOpenChange(false);
      reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verificación 2FA</DialogTitle>
          <DialogDescription>
            Esta acción requiere confirmación. Te enviamos un código de 6 dígitos a tu email.
          </DialogDescription>
        </DialogHeader>

        {!requested ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={requestCode}>Enviar código</Button>
          </DialogFooter>
        ) : (
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="two-fa-code">Código (6 dígitos)</FieldLabel>
              <Input
                id="two-fa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={verify} disabled={submitting}>
                {submitting ? 'Verificando…' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
