'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CircleCheckIcon,
  CircleOffIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import {
  useFinanceAccounts,
  useFinanceCategories,
  useFinanceCategoryMutations,
  KIND_LABELS,
  type AccountType,
  type FinanceAccount,
  type FinanceCategory,
  type FinanceKind,
} from '@/hooks/use-finance';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/lib/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = '__all__';
// Radix no admite '' como valor de Select: "sin cuenta" necesita el suyo.
const NO_ACCOUNT = '__none__';

// Espejo de `ACCOUNT_TYPES_BY_KIND` en `finance-categories.service.ts`: mapear una
// categoría de gasto a una cuenta de ingresos da 409 CATEGORY_ACCOUNT_KIND_MISMATCH.
const ACCOUNT_TYPES_BY_KIND: Record<FinanceKind, AccountType[]> = {
  expense: ['OPERATING_EXPENSE', 'COST_OF_REVENUE'],
  income: ['INCOME'],
};

const accountLabel = (a: FinanceAccount) => `${a.code} ${a.name}`;

export function FinanceCategoriesManager() {
  const [filterKind, setFilterKind] = useState<FinanceKind | undefined>(undefined);
  const { data: categories, isLoading } = useFinanceCategories(filterKind);
  const { create, update, remove } = useFinanceCategoryMutations();
  // El plan entero (37 cuentas, sin paginar): se filtra en cliente por tipo y por
  // activa, que es lo que el backend exige para el mapeo de una categoría.
  const { data: accounts } = useFinanceAccounts();

  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<FinanceKind>('expense');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [accountId, setAccountId] = useState<string>('');
  const [toDelete, setToDelete] = useState<FinanceCategory | null>(null);

  const accountById = useMemo(
    () => new Map((accounts ?? []).map((a) => [a.id, a])),
    [accounts],
  );
  const accountOptions = useMemo(
    () =>
      (accounts ?? []).filter(
        (a) => a.isActive && ACCOUNT_TYPES_BY_KIND[kind].includes(a.type),
      ),
    [accounts, kind],
  );

  function resetForm() {
    setEditing(null);
    setName('');
    setKind('expense');
    setSortOrder(0);
    setIsActive(true);
    setAccountId('');
  }
  const startEdit = useCallback((c: FinanceCategory) => {
    setEditing(c);
    setName(c.name);
    setKind(c.kind);
    setSortOrder(c.sortOrder);
    setIsActive(c.isActive);
    setAccountId(c.accountId ?? '');
  }, []);

  const valid = name.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          input: { name: name.trim(), sortOrder, isActive, accountId: accountId || null },
        });
        toast.success('Categoría actualizada');
      } else {
        await create.mutateAsync({
          name: name.trim(),
          kind,
          sortOrder,
          accountId: accountId || null,
        });
        toast.success('Categoría creada');
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error guardando la categoría');
    }
  }

  const columns = useMemo<ColumnDef<FinanceCategory, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Categoría',
        meta: { label: 'Categoría' },
        enableSorting: false,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'kind',
        header: 'Tipo',
        meta: { label: 'Tipo' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.kind === 'income' ? (
            <StatusBadge tone="success" icon={TrendingUpIcon} label={KIND_LABELS.income} />
          ) : (
            <StatusBadge tone="warning" icon={TrendingDownIcon} label={KIND_LABELS.expense} />
          ),
      },
      {
        accessorKey: 'accountId',
        header: 'Cuenta contable',
        meta: { label: 'Cuenta contable' },
        enableSorting: false,
        cell: ({ row }) => {
          const account = row.original.accountId
            ? accountById.get(row.original.accountId)
            : undefined;
          if (account) return <span className="tabular-nums">{accountLabel(account)}</span>;
          // Sin cuenta el alta de un movimiento falla con CATEGORY_WITHOUT_ACCOUNT:
          // conviene que se vea acá y no recién al guardar el gasto.
          return (
            <span className="text-destructive flex items-center gap-1.5 text-sm">
              <TriangleAlertIcon className="size-3.5" aria-hidden />
              Sin cuenta: los movimientos de esta categoría no se pueden contabilizar
            </span>
          );
        },
      },
      { accessorKey: 'sortOrder', header: 'Orden', meta: { label: 'Orden' }, enableSorting: false },
      {
        accessorKey: 'isActive',
        header: 'Estado',
        meta: { label: 'Estado' },
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge tone="success" icon={CircleCheckIcon} label="Activa" />
          ) : (
            <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactiva" />
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
    [startEdit, accountById],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayersIcon className="text-primary size-4" />
            {editing ? `Editar: ${editing.name}` : 'Nueva categoría'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit}>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="fc-name">Nombre</FieldLabel>
                  <Input id="fc-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="fc-kind">Tipo</FieldLabel>
                  <Select
                    value={kind}
                    onValueChange={(v) => {
                      setKind(v as FinanceKind);
                      // Las cuentas válidas cambian con el tipo: la elegida puede
                      // ya no servir y el backend la rechazaría.
                      setAccountId('');
                    }}
                    disabled={!!editing}
                  >
                    <SelectTrigger id="fc-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">{KIND_LABELS.expense}</SelectItem>
                      <SelectItem value="income">{KIND_LABELS.income}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="fc-order">Orden</FieldLabel>
                  <Input
                    id="fc-order"
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="fc-account">Cuenta contable</FieldLabel>
                <Select
                  value={accountId || NO_ACCOUNT}
                  onValueChange={(v) => setAccountId(v === NO_ACCOUNT ? '' : v)}
                >
                  <SelectTrigger id="fc-account" className="sm:w-96">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ACCOUNT}>Sin cuenta</SelectItem>
                    {accountOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {accountLabel(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Sin cuenta: los movimientos de esta categoría no se pueden contabilizar.
                </FieldDescription>
              </Field>
              {editing && (
                <Field>
                  <FieldLabel htmlFor="fc-active">Estado</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Switch id="fc-active" checked={isActive} onCheckedChange={setIsActive} />
                    <span className="text-sm">{isActive ? 'Activa' : 'Inactiva'}</span>
                  </div>
                </Field>
              )}
              <div className="flex justify-end gap-2">
                {editing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={!valid || create.isPending || update.isPending}>
                  {editing ? <SaveIcon className="size-4" /> : <PlusIcon className="size-4" />}
                  {editing ? 'Guardar' : 'Agregar'}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <DataTable
        toolbar={
          <>
            <Select
              value={filterKind ?? ALL}
              onValueChange={(v) => setFilterKind(v === ALL ? undefined : (v as FinanceKind))}
            >
              <SelectTrigger className="w-36" size="sm" aria-label="Filtrar por tipo">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                <SelectItem value="expense">{KIND_LABELS.expense}</SelectItem>
                <SelectItem value="income">{KIND_LABELS.income}</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto" aria-hidden />
          </>
        }
        columns={columns}
        data={categories ?? []}
        total={categories?.length ?? 0}
        page={1}
        pageSize={categories?.length || 1}
        loading={isLoading}
        onPageChange={() => {}}
        emptyIcon={<LayersIcon />}
        emptyMessage="Sin categorías"
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Borrar categoría"
        description="Si tiene movimientos no se puede borrar (desactivala). No se puede deshacer."
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
