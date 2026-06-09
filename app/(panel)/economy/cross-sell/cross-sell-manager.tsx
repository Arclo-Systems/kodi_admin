'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowLeftRightIcon,
  ArrowRightIcon,
  CircleCheckIcon,
  CircleOffIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/lib/status-badge';
import { useModulesTree } from '@/hooks/use-modules-tree';
import { useCrossSell, useCrossSellMutations, type CrossSell } from '@/hooks/use-cross-sell';

export function CrossSellManager() {
  const { data: items, isLoading, isError } = useCrossSell();
  const { data: modules } = useModulesTree();
  const { create, update, remove } = useCrossSellMutations();

  const [editing, setEditing] = useState<CrossSell | null>(null);
  const [toDelete, setToDelete] = useState<CrossSell | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const moduleLabel = useCallback(
    (id: string) => {
      const m = modules?.find((x) => x.id === id);
      return m ? `${m.country} · ${m.shortName}` : id;
    },
    [modules],
  );

  function resetForm() {
    setEditing(null);
    setSource('');
    setTarget('');
    setMessage('');
    setPriority(0);
    setIsActive(true);
    setError(null);
  }
  const startEdit = useCallback((c: CrossSell) => {
    setEditing(c);
    setSource(c.sourceModuleId);
    setTarget(c.targetModuleId);
    setMessage(c.message);
    setPriority(c.priority);
    setIsActive(c.isActive);
    setError(null);
  }, []);

  const valid = editing
    ? message.trim().length > 0
    : !!source && !!target && source !== target && message.trim().length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const onError = (err: unknown) => setError((err as Error).message);
    if (editing) {
      update.mutate(
        { id: editing.id, input: { message: message.trim(), priority, isActive } },
        { onSuccess: resetForm, onError },
      );
    } else {
      create.mutate(
        { sourceModuleId: source, targetModuleId: target, message: message.trim(), priority, isActive },
        { onSuccess: resetForm, onError },
      );
    }
  }

  const columns = useMemo<ColumnDef<CrossSell, unknown>[]>(
    () => [
      {
        id: 'route',
        header: 'Origen → Destino',
        meta: { label: 'Origen → Destino' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex items-center gap-1 font-medium">
            {moduleLabel(row.original.sourceModuleId)}
            <ArrowRightIcon className="text-muted-foreground size-3" />
            {moduleLabel(row.original.targetModuleId)}
          </span>
        ),
      },
      {
        accessorKey: 'message',
        header: 'Mensaje',
        meta: { label: 'Mensaje' },
        enableSorting: false,
        cell: ({ row }) => <span className="block max-w-xs truncate">{row.original.message}</span>,
      },
      {
        accessorKey: 'priority',
        header: 'Prioridad',
        meta: { label: 'Prioridad' },
        enableSorting: false,
      },
      {
        accessorKey: 'isActive',
        header: 'Estado',
        meta: { label: 'Estado' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
          ) : (
            <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactivo" />
          ),
      },
      {
        id: 'actions',
        header: '',
        meta: { label: 'Acciones' },
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => startEdit(row.original)}>
              <PencilIcon className="size-4" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setToDelete(row.original)}
            >
              <Trash2Icon className="size-4" />
              Borrar
            </Button>
          </div>
        ),
      },
    ],
    [moduleLabel, startEdit],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRightIcon className="text-primary size-4" />
            {editing ? 'Editar cross-sell' : 'Nuevo cross-sell'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Módulo origen</FieldLabel>
                <Select value={source} onValueChange={setSource} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="Elegí un módulo" /></SelectTrigger>
                  <SelectContent>
                    {(modules ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.country} · {m.shortName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Módulo destino</FieldLabel>
                <Select value={target} onValueChange={setTarget} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="Elegí un módulo" /></SelectTrigger>
                  <SelectContent>
                    {(modules ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.country} · {m.shortName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="cs-msg">Mensaje</FieldLabel>
              <Textarea id="cs-msg" value={message} maxLength={280} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            <div className="flex flex-wrap items-end gap-6">
              <Field className="w-32">
                <FieldLabel htmlFor="cs-prio">Prioridad</FieldLabel>
                <Input
                  id="cs-prio"
                  type="number"
                  min="0"
                  value={priority}
                  onChange={(e) => setPriority(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cs-active">Estado</FieldLabel>
                <div className="flex items-center gap-2">
                  <Switch id="cs-active" checked={isActive} onCheckedChange={setIsActive} />
                  <span className="text-sm">{isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
              </Field>
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="flex justify-end gap-2">
              {editing && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
              <Button type="submit" disabled={!valid || create.isPending || update.isPending}>
                {editing ? <SaveIcon className="size-4" /> : <PlusIcon className="size-4" />}
                {editing ? 'Guardar' : 'Agregar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>No se pudieron cargar los cross-sell.</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          toolbar={<div className="ml-auto" aria-hidden />}
          columns={columns}
          data={items ?? []}
          total={items?.length ?? 0}
          page={1}
          pageSize={items?.length || 1}
          loading={isLoading}
          onPageChange={() => {}}
          emptyIcon={<ArrowLeftRightIcon />}
          emptyMessage="Sin cross-sell configurados"
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Borrar cross-sell"
        destructive
        confirmLabel="Borrar"
        onConfirm={async () => {
          if (toDelete) await remove.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
