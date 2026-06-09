'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PlusIcon, Trash2Icon, UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  useSegments,
  useSegmentMutations,
  previewSegmentCount,
  type SegmentFilters,
  type UserSegment,
} from '@/hooks/use-segments';

export function SegmentsManager() {
  const { data, isLoading, isError } = useSegments();
  const { create, remove } = useSegmentMutations();
  const [createOpen, setCreateOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<UserSegment | null>(null);

  const segments = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" /> Nuevo segmento
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <p className="text-destructive text-sm">No se pudieron cargar los segmentos.</p>
      ) : segments.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sin segmentos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Filtros</TableHead>
              <TableHead>Conteo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.name}</div>
                  {s.description && <div className="text-muted-foreground text-xs">{s.description}</div>}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{describeFilters(s.filters)}</TableCell>
                <TableCell>{s.lastCount.toLocaleString('es-CR')}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoveTarget(s)}
                  >
                    <Trash2Icon className="size-4" /> Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateSegmentDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={(i) => create.mutateAsync(i)} />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Eliminar segmento"
        description={removeTarget ? `Se elimina «${removeTarget.name}».` : ''}
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (removeTarget) await remove.mutateAsync(removeTarget.id);
          toast.success('Segmento eliminado');
        }}
      />
    </div>
  );
}

function describeFilters(f: SegmentFilters): string {
  const parts: string[] = [];
  if (f.country?.length) parts.push(`país: ${f.country.join(',')}`);
  if (f.plan?.length) parts.push(`plan: ${f.plan.join(',')}`);
  if (f.accountStatus) parts.push(`estado: ${f.accountStatus}`);
  if (f.lastActiveWithinDays) parts.push(`activo ≤${f.lastActiveWithinDays}d`);
  return parts.length ? parts.join(' · ') : 'todos los usuarios';
}

const PLANS = ['free', 'basico', 'plus', 'pro'] as const;

function CreateSegmentDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (input: { name: string; description?: string; filters: SegmentFilters }) => Promise<unknown>;
}) {
  const [name, setName] = useState('');
  const [plans, setPlans] = useState<string[]>([]);
  const [lastActive, setLastActive] = useState('');
  const [preview, setPreview] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filters: SegmentFilters = {
    plan: plans.length ? plans : undefined,
    lastActiveWithinDays: lastActive ? Number(lastActive) : undefined,
  };

  function togglePlan(p: string) {
    setPlans((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
    setPreview(null);
  }

  async function doPreview() {
    try {
      setPreview(await previewSegmentCount(filters));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await props.onCreate({ name: name.trim(), filters });
      props.onOpenChange(false);
      setName(''); setPlans([]); setLastActive(''); setPreview(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo segmento</DialogTitle>
          <DialogDescription>Definí los filtros y previsualizá cuántos usuarios alcanza.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field><FieldLabel htmlFor="s-name">Nombre</FieldLabel><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field>
            <FieldLabel>Planes</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {PLANS.map((p) => (
                <Button key={p} type="button" size="sm" variant={plans.includes(p) ? 'default' : 'outline'} onClick={() => togglePlan(p)}>
                  {p}
                </Button>
              ))}
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="s-active">Activo en los últimos N días (opcional)</FieldLabel>
            <Input id="s-active" type="number" min={1} max={365} value={lastActive} onChange={(e) => { setLastActive(e.target.value); setPreview(null); }} />
          </Field>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={doPreview}>
              <UsersIcon className="size-4" /> Previsualizar conteo
            </Button>
            {preview !== null && <span className="text-sm font-medium">{preview.toLocaleString('es-CR')} usuarios</span>}
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!name.trim() || submitting} onClick={submit}>{submitting ? 'Creando…' : 'Crear'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
