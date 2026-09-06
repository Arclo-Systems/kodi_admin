'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import { sendFinanceRequest } from './use-finance';

// Impuestos, cierre mensual y paquete del contador (Fase 5). Vive aparte de
// `use-finance.ts` y de `use-finance-planning.ts` por el mismo motivo que el
// controller del backend está partido en tres: son cuatro recursos con su
// propio ciclo de vida, y ninguno se lee al mismo tiempo que el libro.
//
// Ninguna cifra —ni una tarifa— es `number`: viajan como string. `0.13` no
// existe como double, y esa diferencia se multiplica por cada factura.

const BASE = '/api/admin/finance';

// ─── 5.1 Tarifas de impuesto ──────────────────────────────────────────────────
// A qué se le aplica la tarifa. Es parte de la llave (`@@unique(code, appliesTo)`)
// y por eso no se puede editar después: mudarla de ámbito cambiaría
// retroactivamente qué facturas la usaron.
export const TAX_APPLIES_TO = ['GENERAL', 'SPONSOR_INVOICE', 'SUBSCRIPTION'] as const;
export type TaxAppliesTo = (typeof TAX_APPLIES_TO)[number];

export type TaxRule = {
  id: string;
  code: string;
  name: string;
  /** Fracción con 4 decimales: `'0.1300'` es 13 %. */
  rate: string;
  appliesTo: TaxAppliesTo;
  /** `YYYY-MM-DD`: la vigencia es por día civil, no por instante. */
  validFrom: string;
  /** `null` = vigente hasta nuevo aviso. */
  validTo: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaxRuleInput = {
  code: string;
  name: string;
  rate: string;
  appliesTo: TaxAppliesTo;
  validFrom: string;
  validTo: string | null;
};

/** `code` y `appliesTo` no están: son la llave y el backend los rechaza. */
export type TaxRuleUpdate = {
  name?: string;
  rate?: string;
  validFrom?: string;
  validTo?: string | null;
};

export type TaxRuleFilters = {
  appliesTo?: TaxAppliesTo;
  isActive?: boolean;
  /** Solo las vigentes ese día. Es la pregunta "¿qué rige hoy?". */
  on?: string;
};

export function useTaxRules(filters: TaxRuleFilters = {}) {
  const { appliesTo, isActive, on } = filters;
  return useQuery({
    queryKey: ['finance-tax-rules', appliesTo ?? null, isActive ?? null, on ?? null],
    queryFn: async (): Promise<TaxRule[]> => {
      const params = new URLSearchParams();
      if (appliesTo) params.set('appliesTo', appliesTo);
      if (isActive !== undefined) params.set('isActive', String(isActive));
      if (on) params.set('on', on);
      const qs = params.toString();
      return (await fetchJson<TaxRule[]>(`${BASE}/tax-rules${qs ? `?${qs}` : ''}`)) ?? [];
    },
  });
}

export function useTaxRuleMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['finance-tax-rules'] });
  return {
    create: useMutation({
      mutationFn: (input: TaxRuleInput) => sendFinanceRequest(`${BASE}/tax-rules`, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: TaxRuleUpdate }) =>
        sendFinanceRequest(`${BASE}/tax-rules/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    // No hay DELETE: la tarifa con la que se calculó una factura emitida es el
    // respaldo de ese monto. Se retira, no se borra.
    deactivate: useMutation({
      mutationFn: (id: string) =>
        sendFinanceRequest(`${BASE}/tax-rules/${id}/deactivate`, 'POST'),
      onSuccess: invalidate,
    }),
  };
}

// ─── 5.2 Declaración de IVA ───────────────────────────────────────────────────
export const TAX_DECLARATION_STATUSES = ['DRAFT', 'REVIEW', 'FILED', 'CLOSED'] as const;
export type TaxDeclarationStatus = (typeof TAX_DECLARATION_STATUSES)[number];

export const TAX_DECLARATION_KINDS = ['IVA'] as const;
export type TaxDeclarationKind = (typeof TAX_DECLARATION_KINDS)[number];

export type TaxDeclaration = {
  id: string;
  year: number;
  month: number;
  /** `YYYY-MM`. */
  period: string;
  kind: TaxDeclarationKind;
  status: TaxDeclarationStatus;
  currency: string;
  taxableBase: string;
  /** El impuesto del período. Es `ivaRepercutido` en bruto, sin netear nada. */
  taxAmount: string;
  /** IVA cobrado del período (créditos a 2220). */
  ivaRepercutido: string;
  /** Débitos a 2220 (pagos, notas de crédito). Informativo: NO se resta. */
  taxDebits: string;
  /** `null` siempre: el IVA de las compras no se modela en esta versión. */
  ivaSoportado: null;
  /** La advertencia literal del backend. El panel la muestra tal cual. */
  ivaSoportadoNote: string;
  calculatedAt: string;
  notes: string | null;
  filedAt: string | null;
  filedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * `true` = el período se reabrió DESPUÉS de presentarla, así que las cifras
   * congeladas ya no describen el mayor. El panel bloquea las transiciones: lo
   * único que corresponde es recalcular, y para eso hay que volver a borrador.
   */
  stale: boolean;
  /** A qué estados puede pasar AHORA. Vacío = terminal. */
  allowedTransitions: TaxDeclarationStatus[];
};

export type TaxDeclarationLine = {
  entryId: string;
  entryNumber: string;
  date: string;
  description: string;
  base: string;
  /** Lo que el asiento ACREDITÓ a 2220. */
  taxCredit: string;
  /** Lo que DEBITÓ: un pago o una nota de crédito. */
  taxDebit: string;
};

export type TaxDeclarationDetail = TaxDeclaration & {
  snapshot: {
    taxAccountCode: string;
    totals: {
      ivaRepercutido: string;
      taxDebits: string;
      ivaSoportado: null;
      note: string;
    };
    lines: TaxDeclarationLine[];
    /** Monedas con IVA del período que NO se sumaron: no se convierten. */
    excludedCurrencies: { currency: string; taxAmount: string }[];
  };
};

export type TaxDeclarationListQuery = {
  year?: number;
  month?: number;
  /** Hoy solo existe `IVA`, pero el filtro es del contrato y viaja igual. */
  kind?: TaxDeclarationKind;
  status?: TaxDeclarationStatus;
  page: number;
  pageSize: number;
};

export type TaxDeclarationPage = {
  items: TaxDeclaration[];
  total: number;
  page: number;
  pageSize: number;
};

export function useTaxDeclarations(query: TaxDeclarationListQuery) {
  const { year, month, kind, status, page, pageSize } = query;
  return useQuery({
    queryKey: [
      'finance-tax-declarations',
      year ?? null,
      month ?? null,
      kind ?? null,
      status ?? null,
      page,
      pageSize,
    ],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<TaxDeclarationPage> => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (year !== undefined) params.set('year', String(year));
      if (month !== undefined) params.set('month', String(month));
      if (kind) params.set('kind', kind);
      if (status) params.set('status', status);
      return (
        (await fetchJson<TaxDeclarationPage>(`${BASE}/tax-declarations?${params}`)) ?? {
          items: [],
          total: 0,
          page,
          pageSize,
        }
      );
    },
  });
}

/** El detalle es lo único que trae `snapshot`: la lista no lo manda. */
export function useTaxDeclaration(id: string | null) {
  return useQuery({
    queryKey: ['finance-tax-declaration', id],
    enabled: !!id,
    queryFn: async (): Promise<TaxDeclarationDetail | null> =>
      (await fetchJson<TaxDeclarationDetail>(`${BASE}/tax-declarations/${id}`)) ?? null,
  });
}

export type TaxDeclarationInput = {
  year: number;
  month: number;
  kind: TaxDeclarationKind;
  currency: string;
  notes?: string;
};

export function useTaxDeclarationMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['finance-tax-declarations'] });
    void qc.invalidateQueries({ queryKey: ['finance-tax-declaration'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: TaxDeclarationInput) =>
        sendFinanceRequest(`${BASE}/tax-declarations`, 'POST', input),
      onSuccess: invalidate,
    }),
    // Solo DRAFT y REVIEW: una declaración presentada no se recalcula.
    recalculate: useMutation({
      mutationFn: (id: string) =>
        sendFinanceRequest(`${BASE}/tax-declarations/${id}/recalculate`, 'POST'),
      onSuccess: invalidate,
    }),
    transition: useMutation({
      mutationFn: ({ id, to, notes }: { id: string; to: TaxDeclarationStatus; notes?: string }) =>
        sendFinanceRequest(`${BASE}/tax-declarations/${id}/transition`, 'POST', { to, notes }),
      onSuccess: invalidate,
    }),
  };
}

// ─── 5.4 Períodos y cierre mensual ────────────────────────────────────────────
export type PeriodStatus = 'OPEN' | 'CLOSED';

/** Qué impide cerrar el período, ya evaluado por el backend. */
export type PeriodBlocker = {
  code: string;
  message: string;
  /** `true` = `force` + motivo lo puede saltar. */
  forceable: boolean;
};

export type AccountingPeriod = {
  id: string;
  year: number;
  month: number;
  period: string;
  status: PeriodStatus;
  closedAt: string | null;
  closedBy: string | null;
  reopenedAt: string | null;
  reopenedBy: string | null;
  reopenReason: string | null;
  counts: {
    journalEntries: number;
    unpostedEntries: number;
    pendingPlayOrders: number;
  };
  balances: { currency: string; debits: string; credits: string; difference: string }[];
  balanced: boolean;
  /** Vacío = se puede cerrar. */
  blockers: PeriodBlocker[];
};

export function usePeriods(filters: { year?: number; status?: PeriodStatus } = {}) {
  const { year, status } = filters;
  return useQuery({
    queryKey: ['finance-periods', year ?? null, status ?? null],
    queryFn: async (): Promise<AccountingPeriod[]> => {
      const params = new URLSearchParams();
      if (year !== undefined) params.set('year', String(year));
      if (status) params.set('status', status);
      const qs = params.toString();
      return (await fetchJson<AccountingPeriod[]>(`${BASE}/periods${qs ? `?${qs}` : ''}`)) ?? [];
    },
  });
}

export function usePeriodMutations() {
  const qc = useQueryClient();
  // Cerrar y reabrir no solo cambian el período: reabrir uno marca como
  // desactualizada la declaración de ese mes (`stale`), así que la lista y el
  // detalle de declaraciones también quedan viejos y hay que re-preguntarlos.
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['finance-periods'] });
    void qc.invalidateQueries({ queryKey: ['finance-tax-declarations'] });
    void qc.invalidateQueries({ queryKey: ['finance-tax-declaration'] });
  };
  return {
    close: useMutation({
      mutationFn: ({ id, force, reason }: { id: string; force: boolean; reason?: string }) =>
        sendFinanceRequest(`${BASE}/periods/${id}/close`, 'POST', { force, reason }),
      onSuccess: invalidate,
    }),
    // `force` solo existe para saltar el 409 `PERIOD_HAS_FILED_DECLARATION`:
    // reabrir un mes con una declaración presentada la deja desactualizada, y
    // eso es una decisión que alguien toma, no un default.
    reopen: useMutation({
      mutationFn: ({ id, reason, force }: { id: string; reason: string; force?: boolean }) =>
        sendFinanceRequest(`${BASE}/periods/${id}/reopen`, 'POST', {
          reason,
          ...(force ? { force: true } : {}),
        }),
      onSuccess: invalidate,
    }),
  };
}

// ─── 5.5 Paquete del contador ─────────────────────────────────────────────────
export const PACKAGE_FILES = [
  'pdf',
  'mayor.csv',
  'comprobacion.csv',
  'balance.csv',
  'resultados.csv',
] as const;
export type PackageFile = (typeof PACKAGE_FILES)[number];

export const PACKAGE_STATUSES = ['GENERATING', 'READY', 'FAILED', 'DISCARDED'] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

export type AccountantPackage = {
  id: string;
  year: number;
  month: number;
  period: string;
  version: number;
  /** Solo `READY` tiene archivos; las otras dos responden 409 al pedir una URL. */
  status: PackageStatus;
  /** Por qué falló. `null` salvo en `FAILED`. */
  error: string | null;
  currency: string;
  /** Vacío mientras no esté `READY`. */
  files: PackageFile[];
  /** `null` mientras no esté `READY`: no hay nada que medir todavía. */
  metadata: {
    pdfPages: number;
    bytes: Record<string, number>;
    ledgerRows: number;
    balanced: boolean;
  } | null;
  generatedBy: string | null;
  generatedAt: string;
};

export type PackageQuery = { year: number; month: number; currency: string };

const packageQuery = (q: PackageQuery): string =>
  new URLSearchParams({
    year: String(q.year),
    month: String(q.month),
    currency: q.currency,
  }).toString();

/**
 * Las versiones del mes, la más nueva primero.
 *
 * Se re-pregunta sola mientras alguna esté `GENERATING`: la generación es
 * sincrónica, pero otra sesión puede tener una reserva en curso, y una fila que
 * dice "generando" para siempre no se distingue de una rota.
 */
export function useAccountantPackages(query: PackageQuery) {
  return useQuery({
    queryKey: ['finance-accountant-packages', query.year, query.month, query.currency],
    refetchInterval: (q) =>
      (q.state.data ?? []).some((p) => p.status === 'GENERATING') ? 3_000 : false,
    queryFn: async (): Promise<AccountantPackage[]> =>
      (await fetchJson<AccountantPackage[]>(
        `${BASE}/reports/accountant-package?${packageQuery(query)}`,
      )) ?? [],
  });
}

export function useAccountantPackageMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['finance-accountant-packages'] });
  return {
    generate: useMutation({
      mutationFn: (query: PackageQuery) =>
        sendFinanceRequest(`${BASE}/reports/accountant-package?${packageQuery(query)}`, 'POST'),
      onSuccess: invalidate,
    }),
    // Solo para una reserva que quedó colgada (>15 min) o una que falló: una
    // versión READY no se descarta, es el respaldo de lo que se le entregó al
    // contador.
    discard: useMutation({
      mutationFn: (id: string) =>
        sendFinanceRequest(`${BASE}/reports/accountant-package/${id}/discard`, 'POST'),
      onSuccess: invalidate,
    }),
  };
}

/**
 * El endpoint que devuelve el enlace firmado (TTL 300 s) de UN archivo.
 *
 * Devuelve la ruta y no el enlace: quien descarga usa `openSignedAsset`, que
 * abre la pestaña dentro del gesto del click y recién después la navega. Pedir
 * la URL primero y abrir después es lo que come el bloqueador de popups.
 */
export const packageFileUrlPath = (id: string, file: PackageFile): string =>
  `${BASE}/reports/accountant-package/${id}/url?file=${encodeURIComponent(file)}`;
