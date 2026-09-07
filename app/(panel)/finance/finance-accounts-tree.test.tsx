import {
  act,
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AccountBalances, FinanceAccount } from '@/hooks/use-finance';

// Arrastrar de verdad necesita MEDIR el layout, y en jsdom todo mide cero: el
// gesto se prueba en Playwright y acá se prueba lo que el gesto termina
// llamando. `sortableItems` guarda los ids que cada contexto de arrastre conoce,
// que es exactamente lo que impide soltar una cuenta bajo otro padre.
const { dragEnds, sortableItems, sortableArgs } = vi.hoisted(() => ({
  dragEnds: [] as ((event: { active: { id: string }; over: { id: string } | null }) => void)[],
  sortableItems: [] as string[][],
  sortableArgs: [] as { attributes?: { roleDescription?: string } }[],
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
  }) => {
    dragEnds.push(onDragEnd);
    return <>{children}</>;
  },
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: () => [],
}));

vi.mock('@dnd-kit/sortable', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dnd-kit/sortable')>()),
  SortableContext: ({ items, children }: { items: string[]; children: ReactNode }) => {
    sortableItems.push(items);
    return <>{children}</>;
  },
  useSortable: (args: { attributes?: { roleDescription?: string } }) => {
    sortableArgs.push(args);
    return {
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
    };
  },
}));

const create = vi.fn();
const update = vi.fn();
const reorder = vi.fn();
let accounts: FinanceAccount[] = [];
let balances: AccountBalances | undefined;
let balancesError = false;

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceAccounts: () => ({
    data: accounts,
    isLoading: false,
    isError: false,
    isSuccess: true,
    refetch: vi.fn(),
  }),
  useFinanceAccountBalances: () => ({
    data: balancesError ? undefined : balances,
    isLoading: false,
    isError: balancesError,
    refetch: vi.fn(),
  }),
  useFinanceAccountMutations: () => ({
    create: { mutateAsync: create },
    update: { mutateAsync: update },
    reorder: { mutateAsync: reorder },
  }),
}));

import { FinanceAccountsTree } from './finance-accounts-tree';

// Abrir un `Select` de Radix en jsdom cuesta ~1 s y este archivo encadena
// varios por test: con 80 archivos corriendo en paralelo los 5 s por defecto se
// agotan por el reloj, no por el código. El resto de la suite NO paga esto.
vi.setConfig({ testTimeout: 20_000 });

// El provider de tooltips lo pone el layout raíz del panel.
const render = (ui: ReactElement) => rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

function account(over: Partial<FinanceAccount> = {}): FinanceAccount {
  return {
    id: 'acc-6000',
    code: '6000',
    name: 'Gastos operativos',
    type: 'OPERATING_EXPENSE',
    currency: null,
    parentId: null,
    isActive: true,
    allowsManualEntry: false,
    isSystem: false,
    sortOrder: 0,
    parentCode: null,
    depth: 0,
    ancestorCodes: [],
    ...over,
  };
}

const PADRE = account();
const HIJA = account({
  id: 'acc-6900',
  code: '6900',
  name: 'Otros gastos operativos',
  parentId: PADRE.id,
  parentCode: PADRE.code,
  depth: 1,
  allowsManualEntry: true,
});
// Segunda hija del mismo padre: es lo que hace que haya algo que reordenar.
const HERMANA = account({
  id: 'acc-6910',
  code: '6910',
  name: 'Gastos legales',
  parentId: PADRE.id,
  parentCode: PADRE.code,
  depth: 1,
  sortOrder: 1,
  allowsManualEntry: true,
});

// Retirada y sin saldo en la moneda mirada: es la única cuenta que
// `reports/balances` puede no devolver.
const RETIRADA = account({
  id: 'acc-1103',
  code: '1103',
  name: 'Caja vieja',
  type: 'ASSET',
  parentId: null,
  parentCode: null,
  depth: 0,
  isActive: false,
});

// La resuelve el CÓDIGO por su `code`: el panel la muestra pero no la retira ni
// le cuelga subcuentas (el backend responde 409 ACCOUNT_IS_SYSTEM).
const SISTEMA = account({
  id: 'acc-4110',
  code: '4110',
  name: 'Ingresos por suscripciones',
  type: 'INCOME',
  parentId: null,
  parentCode: null,
  depth: 0,
  isSystem: true,
});

// Padre retirado con una hija que sigue `isActive: true` en la fila.
const PADRE_RETIRADO = account({
  id: 'acc-6500',
  code: '6500',
  name: 'Gastos discontinuados',
  isActive: false,
});
const HIJA_HUERFANA = account({
  id: 'acc-6510',
  code: '6510',
  name: 'Alquiler viejo',
  parentId: PADRE_RETIRADO.id,
  parentCode: PADRE_RETIRADO.code,
  depth: 1,
  allowsManualEntry: true,
});

const dialog = () => screen.getByRole('dialog');

/** La fila del árbol de una cuenta: su nombre accesible es `código nombre`. */
const fila = (account: FinanceAccount): HTMLElement =>
  screen.getByRole('treeitem', { name: `${account.code} ${account.name}` });

/** Los nombres de las filas visibles, en el orden en que se pintan. */
const filasVisibles = (): (string | null)[] =>
  screen.getAllByRole('treeitem').map((r) => r.getAttribute('aria-label'));

async function abrirAlta(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Nueva cuenta' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());
}

beforeEach(() => {
  vi.clearAllMocks();
  dragEnds.length = 0;
  sortableItems.length = 0;
  sortableArgs.length = 0;
  window.localStorage.clear();
  balancesError = false;
  accounts = [PADRE, HIJA];
  balances = {
    currency: 'CRC',
    asOf: '2026-10-02T05:59:59.999Z',
    accounts: [
      {
        accountId: HIJA.id,
        code: HIJA.code,
        name: HIJA.name,
        type: HIJA.type,
        isActive: true,
        balance: '1400.00',
      },
    ],
  };
  create.mockResolvedValue(undefined);
  update.mockResolvedValue(undefined);
  reorder.mockResolvedValue(undefined);
});

describe('FinanceAccountsTree — el plan se lee como un árbol con saldo', () => {
  it('muestra cada cuenta con su moneda y el saldo del reporte', () => {
    render(<FinanceAccountsTree canWrite />);

    expect(fila(HIJA)).toHaveTextContent('6900');
    expect(fila(HIJA)).toHaveTextContent('1 400,00');
    // La clase se nombra en la raíz de la rama; abajo la heredan todas.
    expect(fila(PADRE)).toHaveTextContent('Gasto operativo');
  });

  it('sin permiso de escritura no ofrece alta, edición ni arrastre', () => {
    accounts = [PADRE, HIJA, HERMANA];
    render(<FinanceAccountsTree />);

    expect(screen.queryByRole('button', { name: 'Nueva cuenta' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Reordenar/ })).toBeNull();
  });
});

describe('FinanceAccountsTree — alta de una cuenta hija', () => {
  it('rechaza un código que no son 4 dígitos antes de mandarlo', async () => {
    render(<FinanceAccountsTree canWrite />);
    await abrirAlta();

    fireEvent.click(within(dialog()).getByRole('combobox', { name: /Cuenta padre/ }));
    fireEvent.click(await screen.findByRole('option', { name: '6000 Gastos operativos' }));
    fireEvent.change(within(dialog()).getByLabelText('Código'), { target: { value: '69' } });
    fireEvent.change(within(dialog()).getByLabelText('Nombre'), { target: { value: 'Legales' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('El código son 4 dígitos')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('exige que el código empiece por el dígito de la clase heredada', async () => {
    render(<FinanceAccountsTree canWrite />);
    await abrirAlta();

    fireEvent.click(within(dialog()).getByRole('combobox', { name: /Cuenta padre/ }));
    fireEvent.click(await screen.findByRole('option', { name: '6000 Gastos operativos' }));
    fireEvent.change(within(dialog()).getByLabelText('Código'), { target: { value: '1901' } });
    fireEvent.change(within(dialog()).getByLabelText('Nombre'), { target: { value: 'Legales' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText(/empieza con 6/)).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('manda el alta con el padre elegido y la clase la hereda el backend', async () => {
    render(<FinanceAccountsTree canWrite />);
    await abrirAlta();

    fireEvent.click(within(dialog()).getByRole('combobox', { name: /Cuenta padre/ }));
    fireEvent.click(await screen.findByRole('option', { name: '6000 Gastos operativos' }));
    fireEvent.change(within(dialog()).getByLabelText('Código'), { target: { value: '6901' } });
    fireEvent.change(within(dialog()).getByLabelText('Nombre'), {
      target: { value: 'Gastos legales' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith({
      code: '6901',
      name: 'Gastos legales',
      parentId: PADRE.id,
      currency: null,
      allowsManualEntry: true,
    });
  });
});

describe('FinanceAccountsTree — edición: el PATCH lleva solo lo que se tocó', () => {
  async function abrirEdicion(): Promise<void> {
    fireEvent.click(within(fila(HIJA)).getByRole('button', { name: 'Editar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());
  }

  it('el código se puede leer y copiar, pero no cambiar', async () => {
    render(<FinanceAccountsTree canWrite />);
    await abrirEdicion();

    const codigo = within(dialog()).getByLabelText('Código');
    expect(codigo).toHaveAttribute('readonly');
    expect(codigo).toHaveValue(HIJA.code);
    expect(within(dialog()).queryByRole('combobox', { name: /Cuenta padre/ })).toBeNull();
  });

  // El backend corre su comprobación de líneas con que `currency` esté PRESENTE:
  // reenviarla sin cambio hacía que renombrar una cuenta con asientos muriera en
  // un 409 ACCOUNT_HAS_LINES que no tenía nada que ver con lo pedido.
  it('renombrar no manda currency', async () => {
    render(<FinanceAccountsTree canWrite />);
    await abrirEdicion();

    fireEvent.change(within(dialog()).getByLabelText('Nombre'), {
      target: { value: 'Otros gastos varios' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith({
      id: HIJA.id,
      input: { name: 'Otros gastos varios' },
    });
  });

  it('retirar manda exactamente { isActive: false }, previa confirmación', async () => {
    render(<FinanceAccountsTree canWrite />);
    await abrirEdicion();

    fireEvent.click(within(dialog()).getByRole('switch', { name: 'Activa' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Guardar' }));

    // Retirar arrastra a la rama: no se hace sin confirmar.
    expect(await screen.findByText('Retirar cuenta')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Al retirar esta cuenta también dejan de estar disponibles sus subcuentas para nuevos movimientos.',
      ),
    ).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Retirar' }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith({ id: HIJA.id, input: { isActive: false } });
    expect(screen.queryByRole('button', { name: 'Borrar' })).toBeNull();
  });

  it('guardar sin tocar nada no manda un PATCH vacío', async () => {
    render(<FinanceAccountsTree canWrite />);
    await abrirEdicion();

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(update).not.toHaveBeenCalled();
  });
});

describe('FinanceAccountsTree — saldos', () => {
  it('con el reporte caído la celda dice que no hay dato, no un cero', async () => {
    balancesError = true;
    render(<FinanceAccountsTree canWrite />);

    expect(screen.getByText(/No se pudieron cargar los saldos en CRC/)).toBeInTheDocument();
    expect(fila(HIJA)).toHaveTextContent('sin dato');
    expect(fila(HIJA)).not.toHaveTextContent('0,00');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  // El reporte trae TODA cuenta activa (en cero si no tuvo movimiento) y las
  // retiradas CON saldo. La única que puede faltar es una retirada en cero, y
  // ese cero es un cero de verdad, no un "se desconoce".
  it('una cuenta retirada que el reporte no lista está en cero', () => {
    accounts = [PADRE, HIJA, RETIRADA];
    render(<FinanceAccountsTree canWrite />);

    expect(fila(RETIRADA)).toHaveTextContent('Retirada');
    expect(fila(RETIRADA)).toHaveTextContent('0,00');
  });
});

describe('FinanceAccountsTree — cuentas del sistema', () => {
  it('las marca en el árbol y explica por qué no se tocan', async () => {
    accounts = [PADRE, HIJA, SISTEMA];
    render(<FinanceAccountsTree canWrite />);

    expect(within(fila(SISTEMA)).getByText('Sistema')).toBeInTheDocument();

    const trigger = within(fila(SISTEMA))
      .getByText('Sistema')
      .closest('[data-slot="tooltip-trigger"]');
    fireEvent.pointerMove(trigger as HTMLElement, { pointerType: 'mouse' });
    expect(
      await screen.findAllByText('Cuenta usada por el sistema: no se retira ni recibe subcuentas'),
    ).not.toHaveLength(0);
  });

  it('no ofrece retirarla: el switch de estado no está', async () => {
    accounts = [PADRE, HIJA, SISTEMA];
    render(<FinanceAccountsTree canWrite />);

    fireEvent.click(within(fila(SISTEMA)).getByRole('button', { name: 'Editar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());

    expect(within(dialog()).queryByRole('switch', { name: 'Activa' })).toBeNull();
    // El nombre sí se sigue editando: el flag protege dos operaciones, no la cuenta.
    expect(within(dialog()).getByLabelText('Nombre')).toBeInTheDocument();
  });

  it('no se puede elegir como padre de una cuenta nueva', async () => {
    accounts = [PADRE, HIJA, SISTEMA];
    render(<FinanceAccountsTree canWrite />);
    await abrirAlta();

    fireEvent.click(within(dialog()).getByRole('combobox', { name: /Cuenta padre/ }));
    expect(
      await screen.findByRole('option', { name: '6000 Gastos operativos' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '4110 Ingresos por suscripciones' })).toBeNull();
  });
});

describe('FinanceAccountsTree — una hija de cuenta retirada no está disponible', () => {
  it('no la pinta "Activa" a secas: dice que el padre está retirado', () => {
    accounts = [PADRE_RETIRADO, HIJA_HUERFANA];
    render(<FinanceAccountsTree canWrite />);

    expect(fila(HIJA_HUERFANA)).toHaveTextContent('Activa (padre retirado)');
  });

  it('la hija de un padre vigente sigue diciendo Activa', () => {
    accounts = [PADRE, HIJA];
    render(<FinanceAccountsTree canWrite />);

    expect(fila(HIJA)).toHaveTextContent('Activa');
    expect(fila(HIJA)).not.toHaveTextContent('padre retirado');
  });
});

describe('FinanceAccountsTree — el árbol se pliega y se despliega', () => {
  it('arranca entero a la vista y esconde la rama al plegarla', () => {
    render(<FinanceAccountsTree canWrite />);

    expect(fila(PADRE)).toHaveAttribute('aria-expanded', 'true');
    expect(filasVisibles()).toHaveLength(2);

    fireEvent.click(within(fila(PADRE)).getByRole('button', { name: 'Plegar Gastos operativos' }));

    expect(fila(PADRE)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', { name: '6900 Otros gastos operativos' })).toBeNull();
  });

  // Si el pliegue no se recuerda, la pantalla se re-arma entera en cada visita y
  // volver a la rama que se estaba mirando cuesta los mismos clics de siempre.
  it('recuerda lo plegado entre visitas', () => {
    const { unmount } = render(<FinanceAccountsTree canWrite />);
    fireEvent.click(within(fila(PADRE)).getByRole('button', { name: 'Plegar Gastos operativos' }));
    unmount();

    render(<FinanceAccountsTree canWrite />);
    expect(fila(PADRE)).toHaveAttribute('aria-expanded', 'false');
  });

  it('una hoja no anuncia expansión: no hay nada que abrir', () => {
    render(<FinanceAccountsTree canWrite />);
    expect(fila(HIJA)).not.toHaveAttribute('aria-expanded');
  });
});

describe('FinanceAccountsTree — el árbol se anuncia como árbol y se camina con el teclado', () => {
  beforeEach(() => {
    accounts = [PADRE, HIJA, HERMANA];
  });

  it('expone la jerarquía con tree y el nivel de cada cuenta', () => {
    render(<FinanceAccountsTree canWrite />);

    expect(screen.getByRole('tree', { name: 'Plan de cuentas' })).toBeInTheDocument();
    expect(fila(PADRE)).toHaveAttribute('aria-level', '1');
    expect(fila(HIJA)).toHaveAttribute('aria-level', '2');
  });

  it('ocupa UNA parada de tabulador: solo la primera fila es tabulable', () => {
    render(<FinanceAccountsTree canWrite />);

    expect(screen.getAllByRole('treeitem').map((r) => r.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
    ]);
  });

  it('las flechas bajan, suben y saltan al padre sin salir del árbol', () => {
    render(<FinanceAccountsTree canWrite />);

    const padre = fila(PADRE);
    act(() => padre.focus());
    fireEvent.keyDown(padre, { key: 'ArrowDown' });
    expect(fila(HIJA)).toHaveFocus();
    // Y la parada del tabulador se mueve con el foco: volver al árbol lo
    // devuelve donde se dejó, no al principio.
    expect(fila(HIJA)).toHaveAttribute('tabindex', '0');
    expect(padre).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(fila(HIJA), { key: 'ArrowUp' });
    expect(fila(PADRE)).toHaveFocus();
  });

  it('Derecha pliega y despliega, e Izquierda sube al padre', () => {
    render(<FinanceAccountsTree canWrite />);

    const padre = fila(PADRE);
    act(() => padre.focus());
    // Sobre un nodo abierto, Derecha baja a la primera hija.
    fireEvent.keyDown(padre, { key: 'ArrowRight' });
    expect(fila(HIJA)).toHaveFocus();

    // Sobre una hoja, Izquierda sube al padre.
    fireEvent.keyDown(fila(HIJA), { key: 'ArrowLeft' });
    expect(fila(PADRE)).toHaveFocus();

    // Sobre un nodo abierto, Izquierda lo cierra; Derecha lo vuelve a abrir.
    fireEvent.keyDown(fila(PADRE), { key: 'ArrowLeft' });
    expect(fila(PADRE)).toHaveAttribute('aria-expanded', 'false');
    fireEvent.keyDown(fila(PADRE), { key: 'ArrowRight' });
    expect(fila(PADRE)).toHaveAttribute('aria-expanded', 'true');
  });

  // Con los controles de la fila tabulables, recorrer el plan eran tres o cuatro
  // paradas POR FILA antes de llegar al siguiente control de la página. El
  // fixture incluye una cuenta del sistema: su badge lleva un `<button>` de
  // Radix que también estaba en el orden de tabulación.
  it('los controles de la fila salen del orden de tabulación', () => {
    accounts = [PADRE, HIJA, HERMANA, SISTEMA];
    render(<FinanceAccountsTree canWrite />);

    expect(within(fila(SISTEMA)).getByText('Sistema')).toBeInTheDocument();
    const tabulables = document.querySelectorAll(
      '[role="tree"] button:not([tabindex="-1"]), [role="tree"] a, [role="tree"] input',
    );
    expect(tabulables).toHaveLength(0);
    expect(
      screen.getAllByRole('treeitem').filter((r) => r.getAttribute('tabindex') === '0'),
    ).toHaveLength(1);
  });

  // dnd-kit anuncia la agarradera como "sortable" si no se le dice otra cosa, en
  // inglés y en medio de una frase en español. Quien pone el
  // `aria-roledescription` en el DOM es dnd-kit —eso es su contrato, no el
  // nuestro—: lo que se afirma acá es que se lo pedimos en español.
  it('le pide a dnd-kit el rol de la agarradera en español', () => {
    accounts = [PADRE, HIJA, HERMANA];
    render(<FinanceAccountsTree canWrite />);

    expect(sortableArgs).not.toHaveLength(0);
    for (const args of sortableArgs) {
      expect(args.attributes?.roleDescription).toBe('reordenable');
    }
  });

  it('Enter y Espacio pliegan y despliegan desde la fila', () => {
    render(<FinanceAccountsTree canWrite />);

    const padre = fila(PADRE);
    act(() => padre.focus());
    fireEvent.keyDown(padre, { key: 'Enter' });
    expect(fila(PADRE)).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(fila(PADRE), { key: ' ' });
    expect(fila(PADRE)).toHaveAttribute('aria-expanded', 'true');
  });

  it('la tecla E abre la edición de la cuenta enfocada', async () => {
    render(<FinanceAccountsTree canWrite />);

    const hija = fila(HIJA);
    act(() => hija.focus());
    fireEvent.keyDown(hija, { key: 'e' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());
    expect(within(dialog()).getByLabelText('Código')).toHaveValue(HIJA.code);
  });

  it('sin permiso de escritura la tecla E no abre nada', () => {
    render(<FinanceAccountsTree />);

    const hija = fila(HIJA);
    act(() => hija.focus());
    fireEvent.keyDown(hija, { key: 'e' });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('la tecla R toma la agarradera, que es de donde manda el arrastre', () => {
    accounts = [PADRE, HIJA, HERMANA];
    render(<FinanceAccountsTree canWrite />);

    const hija = fila(HIJA);
    act(() => hija.focus());
    fireEvent.keyDown(hija, { key: 'r' });

    expect(
      within(fila(HIJA)).getByRole('button', { name: 'Reordenar 6900 Otros gastos operativos' }),
    ).toHaveFocus();
  });

  // WCAG 2.2 2.5.8: 24x24 CSS px mínimo. `size-6` son 24.
  it('el chevron y la agarradera llegan al mínimo táctil', () => {
    accounts = [PADRE, HIJA, HERMANA];
    render(<FinanceAccountsTree canWrite />);

    const chevron = within(fila(PADRE)).getByRole('button', { name: 'Plegar Gastos operativos' });
    const agarradera = within(fila(HIJA)).getByRole('button', {
      name: 'Reordenar 6900 Otros gastos operativos',
    });
    for (const control of [chevron, agarradera]) expect(control).toHaveClass('size-6');
  });

  // El nombre de la fila es `código nombre`: sin descripción, el lector recorre
  // el plan sin decir un solo saldo ni si la cuenta está retirada.
  it('la fila describe su saldo y su estado, y el árbol su mapa de teclas', () => {
    render(<FinanceAccountsTree canWrite />);

    const described = fila(HIJA).getAttribute('aria-describedby')?.split(' ') ?? [];
    // El separador de miles es un espacio DURO: se compara el resto del número.
    const textos = described.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    expect(textos).toContain('400,00');
    expect(textos).toContain('Activa');
    expect(textos).toContain('Todas');

    const arbol = screen.getByRole('tree', { name: 'Plan de cuentas' });
    const teclas = document.getElementById(arbol.getAttribute('aria-describedby') ?? '');
    expect(teclas?.textContent).toContain('La tecla E abre la edición');
  });

  it('Home y End van a la primera y a la última cuenta visible', () => {
    render(<FinanceAccountsTree canWrite />);

    const padre = fila(PADRE);
    act(() => padre.focus());
    fireEvent.keyDown(padre, { key: 'End' });
    expect(fila(HERMANA)).toHaveFocus();

    fireEvent.keyDown(fila(HERMANA), { key: 'Home' });
    expect(fila(PADRE)).toHaveFocus();
  });
});

describe('FinanceAccountsTree — reordenar entre hermanas', () => {
  beforeEach(() => {
    accounts = [PADRE, HIJA, HERMANA];
  });

  it('cada hermana lleva su agarradera', () => {
    render(<FinanceAccountsTree canWrite />);

    expect(
      within(fila(HIJA)).getByRole('button', { name: 'Reordenar 6900 Otros gastos operativos' }),
    ).toBeInTheDocument();
    expect(
      within(fila(HERMANA)).getByRole('button', { name: 'Reordenar 6910 Gastos legales' }),
    ).toBeInTheDocument();
  });

  // El backend responde 409 ACCOUNT_FIELD_IMMUTABLE si `parentId` viaja en el
  // PATCH: reordenar solo puede mandar posiciones.
  it('soltar una hermana arriba de la otra persiste el orden nuevo', async () => {
    render(<FinanceAccountsTree canWrite />);

    // Lo que el gesto termina llamando: 6910 soltada encima de 6900.
    act(() => dragEnds.at(-1)?.({ active: { id: HERMANA.id }, over: { id: HIJA.id } }));

    await waitFor(() => expect(reorder).toHaveBeenCalled());
    const [positions] = reorder.mock.calls[0] as [{ id: string; sortOrder: number }[]];
    // Solo las hermanas que se corrieron, con su posición nueva: un PATCH que
    // reescribe el mismo número es una fila de auditoría que no dice nada.
    expect(positions).toEqual([
      { id: HERMANA.id, sortOrder: 0 },
      { id: HIJA.id, sortOrder: 1 },
    ]);
    for (const p of positions) expect(p).not.toHaveProperty('parentId');
  });

  // La jerarquía es inmutable: el contexto de arrastre de un grupo solo conoce
  // los ids de sus hermanas, así que soltar bajo otro padre no es una
  // interacción que exista — no hay nada que rechazar porque no se puede pedir.
  it('el contexto de arrastre solo conoce a las hermanas del grupo', () => {
    render(<FinanceAccountsTree canWrite />);

    expect(sortableItems.at(-1)).toEqual([HIJA.id, HERMANA.id]);
    for (const items of sortableItems) expect(items).not.toContain(PADRE.id);
  });

  it('las raíces también se reordenan entre ellas', () => {
    accounts = [PADRE, HIJA, RETIRADA];
    render(<FinanceAccountsTree canWrite />);

    expect(
      within(fila(RETIRADA)).getByRole('button', { name: 'Reordenar 1103 Caja vieja' }),
    ).toBeInTheDocument();
    expect(filasVisibles()).toHaveLength(3);
  });
});
