'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CircleCheckIcon, CircleOffIcon, LandmarkIcon, PencilIcon, PlusIcon } from 'lucide-react';
import {
  FINANCE_CURRENCIES,
  useFinanceAccountBalances,
  useFinanceAccountMutations,
  useFinanceAccounts,
  type FinanceAccount,
} from '@/hooks/use-finance';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyRow } from '@/components/admin/empty-state';
import { StatusBadge } from '@/lib/status-badge';
import { ACCOUNT_STATUS_LABELS, ACCOUNT_TYPE_LABELS, formatMoney } from './finance-format';
import {
  FinanceAccountDialog,
  type AccountDialogTarget,
  type AccountSubmit,
} from './finance-account-dialog';

const COLUMNS = 7;
const MULTI_CURRENCY = 'Todas';

type QueryState = 'loading' | 'error' | 'ready';

export function FinanceAccountsTree({ canWrite = false }: { canWrite?: boolean }) {
  const [currency, setCurrency] = useState<string>(FINANCE_CURRENCIES[0]);
  const [target, setTarget] = useState<AccountDialogTarget | null>(null);

  const accountsQuery = useFinanceAccounts();
  // Sin `asOf` el backend toma hoy en Costa Rica: mandarlo desde el browser
  // ataría el saldo al reloj del que mira la pantalla.
  const balancesQuery = useFinanceAccountBalances(currency);
  const { create, update } = useFinanceAccountMutations();

  const balancesState: QueryState = balancesQuery.isError
    ? 'error'
    : balancesQuery.isLoading
      ? 'loading'
      : 'ready';

  const balances = useMemo(
    () => new Map((balancesQuery.data?.accounts ?? []).map((a) => [a.accountId, a.balance])),
    [balancesQuery.data],
  );
  // El backend ya devuelve el plan ordenado por código y con `depth` calculado
  // sobre el árbol completo: la jerarquía se pinta con sangría, sin re-armarla.
  const accounts = accountsQuery.data ?? [];

  // El diálogo arma el payload (es el que sabe qué campos se tocaron); acá solo
  // se elige la mutación. El error sube para que lo muestre quien lo disparó.
  async function submit(payload: AccountSubmit): Promise<void> {
    if (payload.mode === 'create') {
      await create.mutateAsync(payload.input);
      toast.success('Cuenta creada');
    } else {
      await update.mutateAsync({ id: payload.id, input: payload.input });
      toast.success('Cuenta actualizada');
    }
    setTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-28" size="sm" aria-label="Moneda del saldo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FINANCE_CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm">Saldo al día de hoy.</span>
        {canWrite && (
          <Button
            size="sm"
            className="ml-auto"
            disabled={accounts.length === 0}
            onClick={() => setTarget({ mode: 'create' })}
          >
            <PlusIcon className="size-4" />
            Nueva cuenta
          </Button>
        )}
      </div>

      {/* Sin saldos la columna queda sin dato: decirlo es lo que impide leer una
          celda vacía como un cero. */}
      {balancesQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>No se pudieron cargar los saldos en {currency}.</span>
            <Button variant="outline" size="sm" onClick={() => void balancesQuery.refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {accountsQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>No se pudo cargar el plan de cuentas.</span>
            <Button variant="outline" size="sm" onClick={() => void accountsQuery.refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead>Clase</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Asientos manuales</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Saldo ({currency})</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountsQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: COLUMNS }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : accounts.length === 0 ? (
                <TableEmptyRow
                  colSpan={COLUMNS}
                  icon={<LandmarkIcon />}
                  message="El plan de cuentas está vacío"
                  description="Se siembra con `seed:accounting` en el backend."
                />
              ) : (
                accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    balance={balances.get(account.id)}
                    balancesState={balancesState}
                    canWrite={canWrite}
                    onEdit={() => setTarget({ mode: 'edit', account })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FinanceAccountDialog
        target={target}
        accounts={accounts}
        onOpenChange={(open) => !open && setTarget(null)}
        onSubmit={submit}
      />
    </div>
  );
}

function AccountRow({
  account,
  balance,
  balancesState,
  canWrite,
  onEdit,
}: {
  account: FinanceAccount;
  balance: string | undefined;
  balancesState: QueryState;
  canWrite: boolean;
  onEdit: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <span
          className="flex items-center gap-2"
          style={{ paddingLeft: `${account.depth * 1.25}rem` }}
        >
          <span className="text-muted-foreground tabular-nums">{account.code}</span>
          <span className={account.depth === 0 ? 'font-semibold' : 'font-medium'}>
            {account.name}
          </span>
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.type]}</TableCell>
      <TableCell>{account.currency ?? MULTI_CURRENCY}</TableCell>
      <TableCell className="text-muted-foreground">
        {account.allowsManualEntry ? 'Sí' : 'No'}
      </TableCell>
      <TableCell>
        {account.isActive ? (
          <StatusBadge tone="success" icon={CircleCheckIcon} label={ACCOUNT_STATUS_LABELS.active} />
        ) : (
          <StatusBadge tone="muted" icon={CircleOffIcon} label={ACCOUNT_STATUS_LABELS.inactive} />
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {balancesState === 'loading' ? (
          <Skeleton className="ml-auto h-4 w-20" />
        ) : balancesState === 'error' ? (
          // Con el reporte caído la celda no puede decir un número: un "—" acá se
          // lee como cero, que es exactamente lo que no se sabe.
          <span className="text-muted-foreground text-sm">sin dato</span>
        ) : (
          // El reporte trae TODA cuenta activa (en cero si no tuvo movimiento) y
          // las retiradas CON saldo: que una cuenta no tenga fila significa que
          // está retirada y en cero.
          formatMoney(balance ?? '0.00')
        )}
      </TableCell>
      <TableCell className="text-right">
        {canWrite && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <PencilIcon className="size-4" />
            Editar
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
