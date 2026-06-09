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
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Textarea } from '@/components/ui/textarea';

export function BanAction({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(): Promise<void> {
    setSubmitting(true);
    const res = await fetch(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason, until: until || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error('Error baneando');
      return;
    }
    toast.success('Usuario baneado');
    router.refresh();
    onOpenChange(false);
    setReason('');
    setUntil('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Banear usuario</DialogTitle>
          <DialogDescription>
            Las sesiones activas se invalidan. Si dejás la fecha vacía, el ban es permanente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="ban-reason">Motivo</FieldLabel>
            <Textarea
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mínimo 3 caracteres"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ban-until">Hasta (opcional)</FieldLabel>
            <DateTimePicker id="ban-until" value={until} onChange={setUntil} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={reason.trim().length < 3 || submitting} onClick={submit}>
            {submitting ? 'Baneando…' : 'Banear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
