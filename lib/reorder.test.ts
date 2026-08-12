import { describe, it, expect } from 'vitest';
import { moveItem } from './reorder';

describe('moveItem', () => {
  it('sube un elemento una posición', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
  });

  it('baja un elemento una posición', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('no hace nada si el destino se sale por arriba', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });

  it('no hace nada si el destino se sale por abajo', () => {
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });

  it('devuelve una copia, nunca el mismo arreglo', () => {
    const items = ['a', 'b'];
    expect(moveItem(items, 0, 1)).not.toBe(items);
  });
});
