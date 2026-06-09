import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './data-table';

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
