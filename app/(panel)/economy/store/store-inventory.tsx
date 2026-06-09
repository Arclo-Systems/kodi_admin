'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { GiftIcon, PackagePlusIcon, Trash2Icon } from 'lucide-react';
import {
  useStoreItems,
  useInventoryAdjust,
  ITEM_TYPE_LABELS,
  type InventoryAction,
} from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function StoreInventoryDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PackagePlusIcon className="size-4" />
          Ajustar inventario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar inventario</DialogTitle>
          <DialogDescription>
            Otorgá o quitá un ítem del inventario de un usuario (queda en el audit log).
          </DialogDescription>
        </DialogHeader>
        <StoreInventoryBody onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function StoreInventoryBody({ onClose }: { onClose: () => void }) {
  const [friendCode, setFriendCode] = useState('');
  const [itemId, setItemId] = useState('');
  const [action, setAction] = useState<InventoryAction>('grant');
  const [reason, setReason] = useState('');
  const { data } = useStoreItems({ page: 1, pageSize: 100 });
  const adjust = useInventoryAdjust();

  const items = data?.items ?? [];
  const canSubmit =
    friendCode.trim().length > 0 && !!itemId && reason.trim().length >= 3 && !adjust.isPending;

  async function submit(): Promise<void> {
    try {
      await adjust.mutateAsync({ friendCode: friendCode.trim(), itemId, action, reason: reason.trim() });
      toast.success(action === 'grant' ? 'Ítem otorgado' : 'Ítem quitado del inventario');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error ajustando el inventario');
    }
  }

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="si-code">Código de amigo</FieldLabel>
        <Input
          id="si-code"
          placeholder="Código de amigo (ej. SEED-00001)"
          value={friendCode}
          onChange={(e) => setFriendCode(e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel>Ítem</FieldLabel>
        <Select value={itemId || undefined} onValueChange={setItemId}>
          <SelectTrigger>
            <SelectValue placeholder="Elegí un ítem" />
          </SelectTrigger>
          <SelectContent>
            {items.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.name} — {ITEM_TYPE_LABELS[i.itemType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>Solo se listan los primeros 100 ítems.</FieldDescription>
      </Field>

      <Field>
        <FieldLabel>Acción</FieldLabel>
        <Select value={action} onValueChange={(v) => setAction(v as InventoryAction)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grant">Otorgar (+1)</SelectItem>
            <SelectItem value="revoke">Quitar (−1)</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="si-reason">Motivo</FieldLabel>
        <Textarea
          id="si-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Mínimo 3 caracteres (queda en el audit log)"
        />
      </Field>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={!canSubmit}>
          {action === 'grant' ? <GiftIcon className="size-4" /> : <Trash2Icon className="size-4" />}
          {action === 'grant' ? 'Otorgar ítem' : 'Quitar ítem'}
        </Button>
      </DialogFooter>
    </div>
  );
}
