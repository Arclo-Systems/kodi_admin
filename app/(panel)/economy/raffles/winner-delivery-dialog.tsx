'use client';

import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { SaveIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useRaffleActions,
  DELIVERY_LABELS,
  DELIVERY_STATUSES,
  type DeliveryStatus,
  type RaffleWinner,
} from '@/hooks/use-raffles';

type Values = {
  deliveryStatus: DeliveryStatus;
  contactInfo: string;
  prizeNotes: string;
  prizeDeliveredAt: string;
};

export function WinnerDeliveryDialog({
  raffleId,
  winner,
  onClose,
}: {
  raffleId: string;
  winner: RaffleWinner;
  onClose: () => void;
}) {
  const { updateWinner } = useRaffleActions(raffleId);
  const form = useForm<Values>({
    defaultValues: {
      deliveryStatus: winner.deliveryStatus,
      contactInfo: winner.contactInfo ?? '',
      prizeNotes: winner.prizeNotes ?? '',
      prizeDeliveredAt: winner.prizeDeliveredAt ? winner.prizeDeliveredAt.slice(0, 16) : '',
    },
  });

  async function submit(v: Values): Promise<void> {
    try {
      await updateWinner.mutateAsync({
        winnerId: winner.id,
        input: {
          deliveryStatus: v.deliveryStatus,
          contactInfo: v.contactInfo.trim() || null,
          prizeNotes: v.prizeNotes.trim() || null,
          prizeDeliveredAt: v.prizeDeliveredAt ? new Date(v.prizeDeliveredAt).toISOString() : null,
        },
      });
      toast.success('Entrega actualizada');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error actualizando la entrega');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entrega — {winner.user?.displayName ?? 'Ganador'}</DialogTitle>
        </DialogHeader>
        <form id="winner-delivery" onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <Controller
            name="deliveryStatus"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Estado de entrega</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {DELIVERY_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            name="contactInfo"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="w-contact">Contacto</FieldLabel>
                <Input {...field} id="w-contact" maxLength={300} placeholder="Email, teléfono…" />
              </Field>
            )}
          />
          <Controller
            name="prizeDeliveredAt"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="w-delivered">Entregado el</FieldLabel>
                <DateTimePicker id="w-delivered" value={field.value} onChange={field.onChange} />
              </Field>
            )}
          />
          <Controller
            name="prizeNotes"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="w-notes">Notas</FieldLabel>
                <Textarea {...field} id="w-notes" rows={2} maxLength={1000} />
              </Field>
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="winner-delivery" disabled={form.formState.isSubmitting}>
            <SaveIcon className="size-4" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
