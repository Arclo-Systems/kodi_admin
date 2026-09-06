'use client';

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import {
  CircleCheckIcon,
  CircleOffIcon,
  LandmarkIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
} from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const tree = useTreeNavigation(accounts);

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
          {/* El plan ES un árbol: sin `treegrid` + `aria-level` la sangría es la
              única pista de la jerarquía, y una sangría no se lee en voz alta. */}
          <Table role="treegrid" aria-label="Plan de cuentas">
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
                accounts.map((account, index) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    retiredAncestor={hasRetiredAncestor(account, byId)}
                    balance={balances.get(account.id)}
                    balancesState={balancesState}
                    canWrite={canWrite}
                    onEdit={() => setTarget({ mode: 'edit', account })}
                    rowRef={tree.rowRef(index)}
                    tabIndex={tree.tabIndexFor(index)}
                    onFocus={() => tree.onFocus(index)}
                    onKeyDown={(e) => tree.onKeyDown(e, index)}
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

/**
 * Navegación de `treegrid`: una sola parada de tabulador para toda la tabla y las
 * flechas para moverse dentro.
 *
 * Con `tabIndex` en cada fila, tabular por el plan de cuentas son 37 pulsaciones
 * antes de llegar al siguiente control de la página. El patrón ARIA es el
 * contrario: la tabla ocupa UNA parada y adentro se camina con las flechas.
 *
 * El árbol se pinta aplanado y sin plegar, así que ArrowRight/ArrowLeft no
 * expanden nada: bajan a la primera hija y suben al padre, que es lo que esas
 * teclas significan cuando el nodo ya está expandido.
 */
function useTreeNavigation(accounts: FinanceAccount[]) {
  const [focused, setFocused] = useState(0);
  const rows = useRef<(HTMLTableRowElement | null)[]>([]);
  // El plan puede acortarse (un filtro, una recarga). Se acota al leer y no con
  // un efecto: un índice fuera de rango dejaría la tabla sin ninguna fila
  // tabulable, y corregirlo en un efecto pinta un frame con ese estado.
  const current = focused < accounts.length ? focused : 0;

  const move = useCallback((to: number | undefined) => {
    if (to === undefined || to < 0) return false;
    const row = rows.current[to];
    if (!row) return false;
    setFocused(to);
    row.focus();
    return true;
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>, index: number) => {
      // Las flechas dentro de un input o un select del cuerpo de la fila son
      // suyas: mover el foco ahí sería secuestrar el control.
      if (event.target !== event.currentTarget) return;
      const account = accounts[index];
      const target = ((): number | undefined => {
        switch (event.key) {
          case 'ArrowDown':
            return index + 1;
          case 'ArrowUp':
            return index - 1;
          case 'Home':
            return 0;
          case 'End':
            return accounts.length - 1;
          case 'ArrowLeft':
            return account?.parentId
              ? accounts.findIndex((a) => a.id === account.parentId)
              : undefined;
          case 'ArrowRight':
            return account ? accounts.findIndex((a) => a.parentId === account.id) : undefined;
          default:
            return undefined;
        }
      })();
      if (move(target)) event.preventDefault();
    },
    [accounts, move],
  );

  return {
    rowRef: (index: number) => (el: HTMLTableRowElement | null) => {
      rows.current[index] = el;
    },
    // Una sola fila tabulable; el resto se alcanza con las flechas.
    tabIndexFor: (index: number) => (index === current ? 0 : -1),
    onFocus: setFocused,
    onKeyDown,
  };
}

/**
 * Una hija ACTIVA colgando de un padre retirado.
 *
 * El backend ya no lo deja pasar: retirar una cuenta con hijas activas es 409
 * `ACCOUNT_HAS_ACTIVE_CHILDREN` (se retiran de abajo hacia arriba) y reactivar
 * una hija bajo un padre retirado es 409 `ACCOUNT_PARENT_INACTIVE`. El estado
 * solo existe en datos LEGACY, anteriores a esas dos comprobaciones — pero ahí
 * la fila sigue diciendo `isActive: true` mientras el árbol la esconde y
 * `postable` deja de ofrecerla, así que pintarla "Activa" a secas dice lo
 * contrario de lo que pasa al querer usarla.
 */
function hasRetiredAncestor(
  account: FinanceAccount,
  byId: Map<string, FinanceAccount>,
): boolean {
  let parent = account.parentId ? byId.get(account.parentId) : undefined;
  // El plan tiene tres niveles y el backend garantiza que no hay ciclos; el tope
  // es por las dudas, no por diseño.
  for (let depth = 0; parent && depth < 16; depth += 1) {
    if (!parent.isActive) return true;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  return false;
}

function AccountRow({
  account,
  retiredAncestor,
  balance,
  balancesState,
  canWrite,
  onEdit,
  rowRef,
  tabIndex,
  onFocus,
  onKeyDown,
}: {
  account: FinanceAccount;
  retiredAncestor: boolean;
  balance: string | undefined;
  balancesState: QueryState;
  canWrite: boolean;
  onEdit: () => void;
  rowRef: (el: HTMLTableRowElement | null) => void;
  tabIndex: number;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => void;
}) {
  return (
    <TableRow
      ref={rowRef}
      aria-level={account.depth + 1}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className="focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
    >
      <TableCell>
        <span
          className="flex items-center gap-2"
          style={{ paddingLeft: `${account.depth * 1.25}rem` }}
        >
          <span className="text-muted-foreground tabular-nums">{account.code}</span>
          <span className={account.depth === 0 ? 'font-semibold' : 'font-medium'}>
            {account.name}
          </span>
          {account.isSystem && (
            <Tooltip>
              {/* Sin `asChild`: Radix pone su propio `<button>`, que es focusable,
                  anunciable y describible por el tooltip. Un `<span tabIndex={0}>`
                  entra al tab order sin rol ni nombre: el lector de pantalla lo
                  lee como texto suelto. */}
              <TooltipTrigger className="focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none">
                <StatusBadge tone="info" icon={LockIcon} label="Sistema" />
              </TooltipTrigger>
              <TooltipContent>
                Cuenta usada por el sistema: no se retira ni recibe subcuentas
              </TooltipContent>
            </Tooltip>
          )}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.type]}</TableCell>
      <TableCell>{account.currency ?? MULTI_CURRENCY}</TableCell>
      <TableCell className="text-muted-foreground">
        {account.allowsManualEntry ? 'Sí' : 'No'}
      </TableCell>
      <TableCell>
        {account.isActive ? (
          <StatusBadge
            tone={retiredAncestor ? 'muted' : 'success'}
            icon={retiredAncestor ? CircleOffIcon : CircleCheckIcon}
            label={
              retiredAncestor
                ? ACCOUNT_STATUS_LABELS.inheritedInactive
                : ACCOUNT_STATUS_LABELS.active
            }
          />
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
