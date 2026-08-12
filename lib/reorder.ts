/**
 * Mueve un elemento `delta` posiciones dentro de la lista, devolviendo una copia.
 * Si el destino se sale del rango devuelve la lista original (el botón de la UI ya
 * está deshabilitado en los extremos; esto es la red de seguridad).
 */
export function moveItem<T>(items: readonly T[], index: number, delta: number): T[] {
  const target = index + delta;
  const moved = items[index];
  if (moved === undefined || target < 0 || target >= items.length) return [...items];
  const next = items.filter((_, i) => i !== index);
  next.splice(target, 0, moved);
  return next;
}
