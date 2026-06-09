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
import { Textarea } from '@/components/ui/textarea';

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  destructive?: boolean;
  requireReason?: boolean;
  reasonMinLength?: number;
  twoFa?: {
    enabled: boolean;
    requestEndpoint: string;
    action: string;
  };
  onConfirm: (params: { reason?: string; twoFaToken?: string }) => Promise<void> | void;
  confirmLabel?: string;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaRequested, setTwoFaRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const minLen = props.reasonMinLength ?? 3;
  const reasonOk = !props.requireReason || reason.trim().length >= minLen;
  const twoFaOk = !props.twoFa?.enabled || (twoFaRequested && /^\d{6}$/.test(twoFaCode));
  const canConfirm = reasonOk && twoFaOk;

  function reset(): void {
    setReason('');
    setTwoFaCode('');
    setTwoFaRequested(false);
    setError(null);
  }

  async function requestCode(): Promise<void> {
    if (!props.twoFa) return;
    setError(null);
    const res = await fetch(
      `/api/auth/request-2fa?forward=${encodeURIComponent(props.twoFa.requestEndpoint)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: props.twoFa.action }),
      },
    );
    if (!res.ok) {
      setError('No se pudo enviar el código');
      return;
    }
    setTwoFaRequested(true);
  }

  async function confirm(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await props.onConfirm({
        reason: props.requireReason ? reason : undefined,
        twoFaToken: props.twoFa?.enabled ? twoFaCode : undefined,
      });
      props.onOpenChange(false);
      reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        props.onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          {props.description && <DialogDescription>{props.description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {props.requireReason && (
            <Field>
              <FieldLabel htmlFor="confirm-reason">Motivo</FieldLabel>
              <Textarea
                id="confirm-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Mínimo ${minLen} caracteres`}
              />
            </Field>
          )}

          {props.twoFa?.enabled &&
            (!twoFaRequested ? (
              <Button variant="outline" type="button" onClick={requestCode}>
                Enviar código 2FA por email
              </Button>
            ) : (
              <Field>
                <FieldLabel htmlFor="confirm-2fa">Código 2FA (6 dígitos)</FieldLabel>
                <Input
                  id="confirm-2fa"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                />
              </Field>
            ))}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={props.destructive ? 'destructive' : 'default'}
            disabled={!canConfirm || submitting}
            onClick={confirm}
          >
            {submitting ? 'Procesando…' : (props.confirmLabel ?? 'Confirmar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
