'use client';

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import {
  ChevronRightIcon,
  CircleCheckIcon,
  CircleOffIcon,
  GripVerticalIcon,
  LandmarkIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
} from 'lucide-react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/admin/empty-state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusBadge } from '@/lib/status-badge';
import { ACCOUNT_STATUS_LABELS, ACCOUNT_TYPE_LABELS, formatMoney } from './finance-format';
import {
  FinanceAccountDialog,
  type AccountDialogTarget,
  type AccountSubmit,
} from './finance-account-dialog';

const MULTI_CURRENCY = 'Todas';
// Qué ramas dejó plegadas el que mira. Se guarda lo COLAPSADO y no lo abierto:
// el plan nace entero a la vista, y una cuenta nueva tiene que aparecer sola.
const COLLAPSED_KEY = 'kodi.finance.accounts.collapsed';

type QueryState = 'loading' | 'error' | 'ready';

type AccountNode = FinanceAccount & { children: AccountNode[] };

/** Fila visible del árbol, en el orden en que se pinta: es sobre esto que caminan las flechas. */
type VisibleRow = {
  id: string;
  parentId: string | null;
  hasChildren: boolean;
  isOpen: boolean;
};

/**
 * El plan como árbol.
 *
 * El backend devuelve la lista plana ordenada por código, con `sortOrder` por
 * cuenta. La jerarquía se rearma acá porque el orden entre hermanas ya no es el
 * del código: el founder lo reordena a mano.
 */
function buildTree(accounts: FinanceAccount[]): AccountNode[] {
  const nodes = new Map(accounts.map((a) => [a.id, { ...a, children: [] as AccountNode[] }]));
  const roots: AccountNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    // Una hija cuyo padre no vino en la respuesta cuelga de la raíz: esconderla
    // sería perderla de vista sin decir por qué.
    else roots.push(node);
  }
  const sort = (list: AccountNode[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
    for (const child of list) sort(child.children);
  };
  sort(roots);
  return roots;
}

function readCollapsed(): Set<string> {
  // El árbol se pinta primero en el servidor, donde `window` no existe. No hay
  // riesgo de hidratación distinta: en ese primer render el plan todavía no llegó
  // y lo que se dibuja son los esqueletos, iguales en los dos lados.
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(COLLAPSED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    // Modo privado, cuota llena o JSON corrupto: el árbol abre entero, que es el
    // estado inicial correcto. No es un error que valga la pena mostrar.
    return new Set();
  }
}

export function FinanceAccountsTree({ canWrite = false }: { canWrite?: boolean }) {
  const [currency, setCurrency] = useState<string>(FINANCE_CURRENCIES[0]);
  const [target, setTarget] = useState<AccountDialogTarget | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(readCollapsed);

  const accountsQuery = useFinanceAccounts();
  // Sin `asOf` el backend toma hoy en Costa Rica: mandarlo desde el browser
  // ataría el saldo al reloj del que mira la pantalla.
  const balancesQuery = useFinanceAccountBalances(currency);
  const { create, update, reorder } = useFinanceAccountMutations();

  const toggle = useCallback((id: string, open: boolean) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (open) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {
        // Que no se recuerde el pliegue no puede impedir plegarlo.
      }
      return next;
    });
  }, []);

  const balancesState: QueryState = balancesQuery.isError
    ? 'error'
    : balancesQuery.isLoading
      ? 'loading'
      : 'ready';

  const balances = useMemo(
    () => new Map((balancesQuery.data?.accounts ?? []).map((a) => [a.accountId, a.balance])),
    [balancesQuery.data],
  );
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const tree = useMemo(() => buildTree(accounts), [accounts]);

  const visible = useMemo(() => flatten(tree, collapsed), [tree, collapsed]);
  const nav = useTreeNavigation(visible, toggle);

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

  /**
   * Guardar el orden nuevo de un grupo de hermanas.
   *
   * `PATCH /accounts/:id` guarda el `sortOrder` que recibe y no toca el de las
   * demás, así que se manda uno por cada hermana cuya posición cambió — no por
   * todas: un PATCH que reescribe el mismo número es una fila de auditoría que
   * no dice nada.
   */
  async function persistOrder(siblings: AccountNode[], orderedIds: string[]): Promise<void> {
    const positions = orderedIds
      .map((id, index) => ({ id, sortOrder: index }))
      .filter(({ id, sortOrder }) => siblings.find((s) => s.id === id)?.sortOrder !== sortOrder);
    if (positions.length === 0) return;
    try {
      await reorder.mutateAsync(positions);
      toast.success('Orden guardado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el orden');
    }
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
        <CardContent>
          {accountsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={<LandmarkIcon />}
              message="El plan de cuentas está vacío"
              description="Se siembra con `seed:accounting` en el backend."
            />
          ) : (
            <div className="flex flex-col gap-1">
              <div className="text-muted-foreground flex items-center gap-2 px-2 pb-1 text-xs">
                <span className="flex-1">Cuenta</span>
                <span className="w-32 text-right">Saldo ({currency})</span>
                {canWrite && <span className="w-20" />}
              </div>
              {/* El plan ES un árbol: sin `tree` + `aria-level` la sangría es la
                  única pista de la jerarquía, y una sangría no se lee en voz alta. */}
              <div role="tree" aria-label="Plan de cuentas" className="flex flex-col">
                <SiblingGroup
                  siblings={tree}
                  level={1}
                  canWrite={canWrite}
                  row={{
                    byId,
                    balances,
                    balancesState,
                    canWrite,
                    collapsed,
                    toggle,
                    nav,
                    onEdit: (account) => setTarget({ mode: 'edit', account }),
                    onReorder: persistOrder,
                  }}
                />
              </div>
            </div>
          )}
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

/** Las filas que se ven, en orden: una rama plegada no aporta ninguna. */
function flatten(nodes: AccountNode[], collapsed: Set<string>): VisibleRow[] {
  const rows: VisibleRow[] = [];
  const walk = (list: AccountNode[], parentId: string | null) => {
    for (const node of list) {
      const hasChildren = node.children.length > 0;
      const isOpen = hasChildren && !collapsed.has(node.id);
      rows.push({ id: node.id, parentId, hasChildren, isOpen });
      if (isOpen) walk(node.children, node.id);
    }
  };
  walk(nodes, null);
  return rows;
}

type TreeNavigation = ReturnType<typeof useTreeNavigation>;

/**
 * Navegación del árbol: una sola parada de tabulador y las flechas adentro.
 *
 * Con `tabIndex` en cada fila, tabular por el plan de cuentas son 37 pulsaciones
 * antes de llegar al siguiente control de la página. El patrón ARIA es el
 * contrario: el árbol ocupa UNA parada y adentro se camina con las flechas, que
 * acá además pliegan y despliegan (Derecha abre o baja a la primera hija;
 * Izquierda cierra o sube al padre).
 */
function useTreeNavigation(visible: VisibleRow[], toggle: (id: string, open: boolean) => void) {
  const [focused, setFocused] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLDivElement>());
  // Se acota al leer y no con un efecto: plegar una rama puede sacar de pantalla
  // la fila enfocada, y dejar el árbol sin ninguna parada de tabulador —aunque
  // sea por un frame— lo saca del alcance del teclado.
  const current = focused && visible.some((r) => r.id === focused) ? focused : visible[0]?.id;

  const move = useCallback((id: string | undefined) => {
    if (!id) return false;
    const row = rows.current.get(id);
    if (!row) return false;
    setFocused(id);
    row.focus();
    return true;
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, id: string) => {
      // Las flechas dentro de un botón o un select de la fila son suyas: mover
      // el foco ahí sería secuestrar el control.
      if (event.target !== event.currentTarget) return;
      const index = visible.findIndex((r) => r.id === id);
      const row = visible[index];
      if (!row) return;

      const handled = ((): boolean => {
        switch (event.key) {
          case 'ArrowDown':
            return move(visible[index + 1]?.id);
          case 'ArrowUp':
            return index > 0 && move(visible[index - 1]?.id);
          case 'Home':
            return move(visible[0]?.id);
          case 'End':
            return move(visible[visible.length - 1]?.id);
          case 'ArrowRight':
            if (row.hasChildren && !row.isOpen) {
              toggle(id, true);
              return true;
            }
            return row.isOpen && move(visible[index + 1]?.id);
          case 'ArrowLeft':
            if (row.isOpen) {
              toggle(id, false);
              return true;
            }
            return move(row.parentId ?? undefined);
          default:
            return false;
        }
      })();
      if (handled) event.preventDefault();
    },
    [visible, move, toggle],
  );

  return {
    rowRef: (id: string) => (el: HTMLDivElement | null) => {
      if (el) rows.current.set(id, el);
      else rows.current.delete(id);
    },
    // Una sola fila tabulable; el resto se alcanza con las flechas.
    tabIndexFor: (id: string) => (id === current ? 0 : -1),
    // El árbol no tiene selección propia: la "selección" SIGUE al foco, que es el
    // patrón de un árbol de navegación. Sin `aria-selected` un `treeitem` queda
    // incompleto para el lector de pantalla.
    isCurrent: (id: string) => id === current,
    onFocus: setFocused,
    onKeyDown,
  };
}

type RowContext = {
  byId: Map<string, FinanceAccount>;
  balances: Map<string, string>;
  balancesState: QueryState;
  canWrite: boolean;
  collapsed: Set<string>;
  toggle: (id: string, open: boolean) => void;
  nav: TreeNavigation;
  onEdit: (account: FinanceAccount) => void;
  onReorder: (siblings: AccountNode[], orderedIds: string[]) => Promise<void>;
};

/**
 * Un grupo de hermanas, con su propio `DndContext`.
 *
 * Uno por grupo y no uno para todo el árbol: la jerarquía es INMUTABLE (el
 * backend responde 409 `ACCOUNT_FIELD_IMMUTABLE` si `parentId` viaja en el
 * PATCH), y un contexto que solo conoce los ids de sus hermanas no puede
 * ofrecer soltar una cuenta bajo otro padre.
 */
function SiblingGroup({
  siblings,
  level,
  canWrite,
  row,
}: {
  siblings: AccountNode[];
  level: number;
  canWrite: boolean;
  row: RowContext;
}) {
  const ids = siblings.map((s) => s.id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) void row.onReorder(siblings, arrayMove(ids, from, to));
  }

  // Sin permiso de escritura, o con una sola hermana, no hay nada que arrastrar:
  // las filas se pintan sin `useSortable` en vez de montar un contexto de
  // arrastre y una agarradera que no llevan a ninguna parte.
  if (!canWrite || siblings.length < 2) {
    return (
      <>
        {siblings.map((account) => (
          <AccountTreeItem key={account.id} account={account} level={level} ctx={row} />
        ))}
      </>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {siblings.map((account) => (
          <SortableAccountTreeItem key={account.id} account={account} level={level} ctx={row} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

/** La misma fila, atada al contexto de arrastre de su grupo de hermanas. */
function SortableAccountTreeItem(props: {
  account: AccountNode;
  level: number;
  ctx: RowContext;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.account.id,
  });
  return (
    <AccountTreeItem
      {...props}
      drag={{
        setNodeRef,
        handle: { ...attributes, ...listeners },
        style: {
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
        },
      }}
    />
  );
}

type DragBinding = {
  setNodeRef: (el: HTMLElement | null) => void;
  handle: Record<string, unknown>;
  style: CSSProperties;
};

function AccountTreeItem({
  account,
  level,
  ctx,
  drag,
}: {
  account: AccountNode;
  level: number;
  ctx: RowContext;
  drag?: DragBinding;
}) {
  const hasChildren = account.children.length > 0;
  const open = hasChildren && !ctx.collapsed.has(account.id);
  // `aria-label` y no el contenido: un `treeitem` CONTIENE a su grupo, así que
  // el nombre calculado de una rama abierta sería el de todas sus hijas juntas.
  const label = `${account.code} ${account.name}`;
  const balance = ctx.balances.get(account.id);
  const setRowRef = ctx.nav.rowRef(account.id);

  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={(next) => ctx.toggle(account.id, next)}
      disabled={!hasChildren}
    >
      <div
        ref={(el) => {
          drag?.setNodeRef(el);
          setRowRef(el);
        }}
        role="treeitem"
        aria-level={level}
        aria-expanded={hasChildren ? open : undefined}
        aria-selected={ctx.nav.isCurrent(account.id)}
        aria-label={label}
        tabIndex={ctx.nav.tabIndexFor(account.id)}
        // Un `treeitem` CONTIENE a su grupo, y el foco BURBUJEA: sin este filtro,
        // enfocar una hija devolvía la parada del tabulador a su padre —el foco
        // bajaba y el `tabIndex` se quedaba arriba—.
        onFocus={(e) => e.target === e.currentTarget && ctx.nav.onFocus(account.id)}
        onKeyDown={(e) => ctx.nav.onKeyDown(e, account.id)}
        style={drag?.style}
        className="focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
      >
        <div
          className="hover:bg-muted/50 flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5"
          style={{ paddingLeft: `${0.5 + (level - 1) * 1.25}rem` }}
        >
          {hasChildren ? (
            <CollapsibleTrigger
              className="group text-muted-foreground focus-visible:ring-ring rounded focus-visible:ring-2 focus-visible:outline-none"
              aria-label={open ? `Plegar ${account.name}` : `Desplegar ${account.name}`}
            >
              <ChevronRightIcon className="size-4 transition-transform group-data-[state=open]:rotate-90" />
            </CollapsibleTrigger>
          ) : (
            <span className="size-4" aria-hidden />
          )}

          {/* Hueco de la agarradera donde no hay nada que arrastrar (una rama con
              una sola hermana): sin él la fila se corre y las columnas dejan de
              alinearse con las de al lado. */}
          {ctx.canWrite && !drag && <span className="size-4" aria-hidden />}
          {drag && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring cursor-grab touch-none rounded focus-visible:ring-2 focus-visible:outline-none"
              aria-label={`Reordenar ${label}`}
              {...drag.handle}
            >
              <GripVerticalIcon className="size-4" />
            </button>
          )}

          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-muted-foreground tabular-nums">{account.code}</span>
            <span className={`truncate ${level === 1 ? 'font-semibold' : 'font-medium'}`}>
              {account.name}
            </span>
          </span>

          <AccountBadges account={account} hasChildren={hasChildren} byId={ctx.byId} />

          <span data-slot="account-balance" className="w-32 shrink-0 text-right tabular-nums">
            {ctx.balancesState === 'loading' ? (
              <Skeleton className="ml-auto h-4 w-20" />
            ) : ctx.balancesState === 'error' ? (
              // Con el reporte caído la celda no puede decir un número: un "—" acá
              // se lee como cero, que es exactamente lo que no se sabe.
              <span className="text-muted-foreground text-sm">sin dato</span>
            ) : (
              // El reporte trae TODA cuenta activa (en cero si no tuvo movimiento)
              // y las retiradas CON saldo: que una cuenta no tenga fila significa
              // que está retirada y en cero.
              formatMoney(balance ?? '0.00')
            )}
          </span>

          <span className="w-20 shrink-0 text-right">
            {ctx.canWrite && (
              <Button variant="ghost" size="sm" onClick={() => ctx.onEdit(account)}>
                <PencilIcon className="size-4" />
                Editar
              </Button>
            )}
          </span>
        </div>

        {hasChildren && (
          <CollapsibleContent role="group" className="ml-4 border-l">
            <SiblingGroup
              siblings={account.children}
              level={level + 1}
              canWrite={ctx.canWrite}
              row={ctx}
            />
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

function AccountBadges({
  account,
  hasChildren,
  byId,
}: {
  account: FinanceAccount;
  hasChildren: boolean;
  byId: Map<string, FinanceAccount>;
}): ReactNode {
  const retiredAncestor = hasRetiredAncestor(account, byId);
  return (
    <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
      {account.isSystem && (
        <Tooltip>
          {/* Sin `asChild`: Radix pone su propio `<button>`, que es focusable,
              anunciable y describible por el tooltip. Un `<span tabIndex={0}>`
              entra al tab order sin rol ni nombre: el lector de pantalla lo lee
              como texto suelto. */}
          <TooltipTrigger
            type="button"
            className="focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
          >
            <StatusBadge tone="info" icon={LockIcon} label="Sistema" />
          </TooltipTrigger>
          <TooltipContent>
            Cuenta usada por el sistema: no se retira ni recibe subcuentas
          </TooltipContent>
        </Tooltip>
      )}
      {account.isActive ? (
        <StatusBadge
          tone={retiredAncestor ? 'muted' : 'success'}
          icon={retiredAncestor ? CircleOffIcon : CircleCheckIcon}
          label={
            retiredAncestor ? ACCOUNT_STATUS_LABELS.inheritedInactive : ACCOUNT_STATUS_LABELS.active
          }
        />
      ) : (
        <StatusBadge tone="muted" icon={CircleOffIcon} label={ACCOUNT_STATUS_LABELS.inactive} />
      )}
      <span className="text-muted-foreground w-12 text-right text-xs">
        {account.currency ?? MULTI_CURRENCY}
      </span>
      {/* La clase solo en la raíz de cada rama: abajo la heredan todas y
          repetirla en cada fila es ruido que empuja el saldo fuera de pantalla. */}
      {!account.parentId && (
        <span className="text-muted-foreground text-xs">{ACCOUNT_TYPE_LABELS[account.type]}</span>
      )}
      {/* Una hoja que no recibe asientos no se puede elegir en un movimiento, y
          eso no se deduce de ninguna otra marca de la fila. */}
      {!hasChildren && !account.allowsManualEntry && (
        <span className="text-muted-foreground text-xs">No imputable</span>
      )}
    </span>
  );
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
function hasRetiredAncestor(account: FinanceAccount, byId: Map<string, FinanceAccount>): boolean {
  let parent = account.parentId ? byId.get(account.parentId) : undefined;
  // El plan tiene tres niveles y el backend garantiza que no hay ciclos; el tope
  // es por las dudas, no por diseño.
  for (let depth = 0; parent && depth < 16; depth += 1) {
    if (!parent.isActive) return true;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  return false;
}
