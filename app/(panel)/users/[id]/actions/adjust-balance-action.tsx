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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AdjustBalanceAction({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [currency, setCurrency] = useState<'kokos' | 'kolones'>('kokos');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(): Promise<void> {
    if (!/^-?\d+$/.test(delta)) {
      toast.error('La cantidad debe ser un entero');
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/admin/users/${userId}/adjust-balance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currency, delta: parseInt(delta, 10), reason }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      toast.error(body.message ?? 'Error ajustando balance');
      return;
    }
    toast.success('Balance ajustado');
    router.refresh();
    onOpenChange(false);
    setDelta('');
    setReason('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar balance</DialogTitle>
          <DialogDescription>
            Crédito (positivo) o débito (negativo). Se registra como CurrencyTransaction.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel>Moneda</FieldLabel>
            <Select value={currency} onValueChange={(v) => setCurrency(v as 'kokos' | 'kolones')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kokos">Kokos</SelectItem>
                <SelectItem value="kolones">Kolones</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="ab-delta">Cantidad (positiva o negativa)</FieldLabel>
            <Input
              id="ab-delta"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="100 o -50"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ab-reason">Motivo</FieldLabel>
            <Textarea id="ab-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={reason.trim().length < 3 || submitting} onClick={submit}>
            {submitting ? 'Ajustando…' : 'Ajustar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
