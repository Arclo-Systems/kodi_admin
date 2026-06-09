'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CircleCheckIcon, CircleOffIcon, PencilIcon, PlusIcon, SaveIcon, Trash2Icon } from 'lucide-react';
import {
  useReferralMilestones,
  useReferralMilestoneMutations,
  type ReferralMilestone,
  type MilestoneInput,
  type MilestoneRewardInput,
  type NormalizedReward,
} from '@/hooks/use-referrals';
import { useStoreItems } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/lib/status-badge';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';

type RewardType = 'kokos' | 'kolones' | 'item';

type FormState = {
  threshold: number;
  label: string;
  isActive: boolean;
  rewardType: RewardType;
  amount: number;
  itemId: string;
};

const emptyForm = (): FormState => ({
  threshold: 1,
  label: '',
  isActive: true,
  rewardType: 'kokos',
  amount: 50,
  itemId: '',
});

function rewardLabel(r: NormalizedReward, itemName?: string): string {
  if (!r) return '—';
  if (r.type === 'kokos') return `${r.amount} Kokos`;
  if (r.type === 'kolones') return `${r.amount} Kolones`;
  return itemName ?? 'Cosmético';
}

export function ReferralMilestones({ canWrite }: { canWrite: boolean }) {
  const { data: milestones, isLoading } = useReferralMilestones();
  const { create, update, remove } = useReferralMilestoneMutations();
  const { data: storePage } = useStoreItems({ page: 1, pageSize: 100, isActive: true });
  const items = storePage?.items ?? [];
  const itemName = (id: string) => items.find((i) => i.id === id)?.name;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralMilestone | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [toDelete, setToDelete] = useState<ReferralMilestone | null>(null);

  function openNew(): void {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(m: ReferralMilestone): void {
    setEditing(m);
    const r = m.reward;
    setForm({
      threshold: m.threshold,
      label: m.label ?? '',
      isActive: m.isActive,
      rewardType: r?.type ?? 'kokos',
      amount: r && r.type !== 'item' ? r.amount : 50,
      itemId: r && r.type === 'item' ? r.itemId : '',
    });
    setOpen(true);
  }

  function buildReward(): MilestoneRewardInput | null {
    if (form.rewardType === 'item') {
      return form.itemId ? { itemId: form.itemId } : null;
    }
    if (!(form.amount >= 1)) return null;
    return form.rewardType === 'kokos'
      ? { kokos: form.amount }
      : { kolones: form.amount };
  }

  async function save(): Promise<void> {
    if (!(form.threshold >= 1)) {
      toast.error('El umbral de invitados debe ser ≥ 1');
      return;
    }
    const reward = buildReward();
    if (!reward) {
      toast.error('Completá el premio del hito');
      return;
    }
    const input: MilestoneInput = {
      threshold: form.threshold,
      label: form.label.trim() || null,
      isActive: form.isActive,
      reward,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input });
        toast.success('Hito actualizado');
      } else {
        await create.mutateAsync(input);
        toast.success('Hito creado');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openNew}>
            <PlusIcon className="size-4" />
            Agregar hito
          </Button>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (milestones?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground text-sm">Sin hitos todavía.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invitados</TableHead>
              <TableHead>Etiqueta</TableHead>
              <TableHead>Premio</TableHead>
              <TableHead>Otorgados</TableHead>
              <TableHead>Estado</TableHead>
              {canWrite && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones!.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.threshold}</TableCell>
                <TableCell>{m.label ?? '—'}</TableCell>
                <TableCell>
                  {rewardLabel(
                    m.reward,
                    m.reward?.type === 'item' ? itemName(m.reward.itemId) : undefined,
                  )}
                </TableCell>
                <TableCell>{m.grantsCount}</TableCell>
                <TableCell>
                  {m.isActive ? (
                    <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
                  ) : (
                    <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactivo" />
                  )}
                </TableCell>
                {canWrite && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" aria-label="Editar hito" onClick={() => openEdit(m)}>
                      <PencilIcon className="size-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      aria-label="Eliminar hito"
                      onClick={() => setToDelete(m)}
                    >
                      <Trash2Icon className="size-3.5" />
                      Eliminar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar hito' : 'Nuevo hito'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="m-threshold">Invitados (umbral)</FieldLabel>
                <Input
                  id="m-threshold"
                  type="number"
                  min={1}
                  value={form.threshold}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, threshold: Number(e.target.value) }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="m-active">Estado</FieldLabel>
                <div className="flex items-center gap-2">
                  <Switch
                    id="m-active"
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  />
                  <span className="text-sm">{form.isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="m-label">Etiqueta (opcional)</FieldLabel>
              <Input
                id="m-label"
                value={form.label}
                maxLength={80}
                placeholder="Ej: Primer amigo"
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Tipo de premio</FieldLabel>
                <Select
                  value={form.rewardType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, rewardType: v as RewardType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kokos">Kokos</SelectItem>
                    <SelectItem value="kolones">Kolones</SelectItem>
                    <SelectItem value="item">Cosmético</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.rewardType === 'item' ? (
                <Field>
                  <FieldLabel>Cosmético</FieldLabel>
                  <Select
                    value={form.itemId || undefined}
                    onValueChange={(v) => setForm((f) => ({ ...f, itemId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí un ítem" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="m-amount">Cantidad</FieldLabel>
                  <Input
                    id="m-amount"
                    type="number"
                    min={1}
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: Number(e.target.value) }))
                    }
                  />
                </Field>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={create.isPending || update.isPending}>
              {editing ? <SaveIcon className="size-4" /> : <PlusIcon className="size-4" />}
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar hito"
        description="Solo se puede borrar si todavía no otorgó premios."
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await remove.mutateAsync(toDelete.id);
            toast.success('Hito eliminado');
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </div>
  );
}
