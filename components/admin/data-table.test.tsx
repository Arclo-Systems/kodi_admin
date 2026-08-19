import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, type DataTableProps } from './data-table';

type Row = { id: string; name: string };

describe('DataTable', () => {
  it('renderiza filas', () => {
    const cols: ColumnDef<Row, unknown>[] = [{ accessorKey: 'name', header: 'Nombre' }];
    render(
      <DataTable
        columns={cols}
        data={[{ id: '1', name: 'Milo' }]}
        total={1}
        page={1}
        pageSize={20}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Milo')).toBeInTheDocument();
  });

  it('muestra empty state', () => {
    render(
      <DataTable
        columns={[{ accessorKey: 'name', header: 'N' }]}
        data={[]}
        total={0}
        page={1}
        pageSize={20}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('No hay resultados')).toBeInTheDocument();
  });
});

type SortRow = { id: string; name: string; score: number | null; date: string | null };

const SORT_COLUMNS: ColumnDef<SortRow, unknown>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'score', header: 'Puntaje' },
  { accessorKey: 'date', header: 'Fecha' },
];

const SORT_DATA: SortRow[] = [
  { id: '1', name: 'Ávila', score: 9, date: '2026-03-01' },
  { id: '2', name: 'banana', score: 100, date: null },
  { id: '3', name: 'ana', score: null, date: '2026-01-15' },
];

function renderSortable(props: Partial<DataTableProps<SortRow>> = {}) {
  return render(
    <DataTable
      columns={SORT_COLUMNS}
      data={SORT_DATA}
      total={SORT_DATA.length}
      page={1}
      pageSize={20}
      onPageChange={vi.fn()}
      {...props}
    />,
  );
}

function namesInOrder(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.querySelectorAll('td')[0]?.textContent ?? '');
}

function clickHeader(name: string): void {
  fireEvent.click(screen.getByRole('button', { name: `Ordenar por ${name}` }));
}

describe('DataTable · orden del lado del cliente', () => {
  it('ordena texto ignorando acentos y mayúsculas, y cicla asc → desc → sin orden', () => {
    renderSortable();
    expect(namesInOrder()).toEqual(['Ávila', 'banana', 'ana']);

    clickHeader('Nombre');
    expect(namesInOrder()).toEqual(['ana', 'Ávila', 'banana']);

    clickHeader('Nombre');
    expect(namesInOrder()).toEqual(['banana', 'Ávila', 'ana']);

    clickHeader('Nombre');
    expect(namesInOrder()).toEqual(['Ávila', 'banana', 'ana']);
  });

  it('ordena números como números y deja los vacíos al final en ambas direcciones', () => {
    renderSortable();

    clickHeader('Puntaje');
    expect(namesInOrder()).toEqual(['Ávila', 'banana', 'ana']);

    clickHeader('Puntaje');
    expect(namesInOrder()).toEqual(['banana', 'Ávila', 'ana']);
  });

  it('ordena fechas ISO cronológicamente', () => {
    renderSortable();

    clickHeader('Fecha');
    expect(namesInOrder()).toEqual(['ana', 'Ávila', 'banana']);
  });

  it('con onSortingChange delega en el padre y no reordena localmente', () => {
    const onSortingChange = vi.fn();
    renderSortable({ onSortingChange });

    clickHeader('Nombre');

    expect(onSortingChange).toHaveBeenCalledWith([{ id: 'name', desc: false }]);
    expect(namesInOrder()).toEqual(['Ávila', 'banana', 'ana']);
  });
});
