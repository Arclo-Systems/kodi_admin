'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function EmailChangeAction({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset(): void {
    setNewEmail('');
    setCode('');
    setRequested(false);
    setError(null);
  }

  async function requestCode(): Promise<void> {
    if (!EMAIL_RE.test(newEmail)) {
      setError('Email inválido');
      return;
    }
    setError(null);
    const endpoint = `/v1/admin/users/${userId}/request-2fa`;
    const res = await fetch(`/api/auth/request-2fa?forward=${encodeURIComponent(endpoint)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'user_email_change' }),
    });
    if (!res.ok) {
      setError('No se pudo enviar el código');
      return;
    }
    setRequested(true);
  }

  async function submit(): Promise<void> {
    if (!/^\d{6}$/.test(code)) {
      setError('El código debe ser de 6 dígitos');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}/email-change`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ newEmail, twoFaToken: code }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setError(body.message ?? 'Error cambiando el email');
      return;
    }
    toast.success('Email actualizado');
    router.refresh();
    onOpenChange(false);
    reset();
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
          <DialogTitle>Cambiar email</DialogTitle>
          <DialogDescription>Requiere verificación 2FA por email del admin.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="ec-email">Nuevo email</FieldLabel>
            <Input
              id="ec-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={requested}
            />
          </Field>
          {requested && (
            <Field>
              <FieldLabel htmlFor="ec-code">Código 2FA (6 dígitos)</FieldLabel>
              <Input
                id="ec-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {!requested ? (
            <Button onClick={requestCode}>Enviar código</Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? 'Cambiando…' : 'Confirmar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
