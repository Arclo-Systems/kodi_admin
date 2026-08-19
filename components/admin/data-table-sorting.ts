import type { SortingFn, SortingState } from '@tanstack/react-table';

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}|$)/;
const NUMERIC = /^-?\d+(\.\d+)?$/;

type Sortable = number | string;

// Los valores vacíos (null, undefined, '', NaN) se colapsan a null para poder empujarlos al final.
function toSortable(value: unknown): Sortable | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value !== 'string') return String(value);

  const text = value.trim();
  if (text === '') return null;
  if (ISO_DATE.test(text)) {
    const time = Date.parse(text);
    if (!Number.isNaN(time)) return time;
  }
  if (NUMERIC.test(text)) return Number(text);
  return text;
}

/**
 * Orden por defecto de las columnas del DataTable: números como números, fechas ISO como fechas y
 * texto con `localeCompare` español (ignora acentos y mayúsculas), con los vacíos siempre al final.
 *
 * Recibe el `SortingState` porque el row model invierte el signo del comparador en `desc`: para que
 * los vacíos queden al final en las dos direcciones hay que pre-invertir su signo.
 */
export function smartSortingFn<TData>(sorting: SortingState): SortingFn<TData> {
  const descById = new Map(sorting.map((s) => [s.id, s.desc]));

  return (rowA, rowB, columnId) => {
    const a = toSortable(rowA.getValue(columnId));
    const b = toSortable(rowB.getValue(columnId));

    if (a === null || b === null) {
      if (a === b) return 0;
      const emptyLast = a === null ? 1 : -1;
      return descById.get(columnId) ? -emptyLast : emptyLast;
    }
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return collator.compare(String(a), String(b));
  };
}
