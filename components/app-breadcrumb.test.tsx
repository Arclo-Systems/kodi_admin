import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppBreadcrumb } from './app-breadcrumb';

const mockPathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname() }));

describe('AppBreadcrumb', () => {
  // `/content/modules-tree/[kind]/[id]`: el segmento del kind no tiene página
  // propia. Cuando era link, entrar a un módulo y tocar "Module" en el camino
  // llevaba a un 404 (reportado por el founder, 2026-08-01).
  it.each([
    ['module', 'Módulo'],
    ['subject', 'Materia'],
    ['topic', 'Tema'],
  ])('el segmento %s no es un link y se ve en español', (kind, etiqueta) => {
    mockPathname.mockReturnValue(`/content/modules-tree/${kind}/abc-123`);

    render(<AppBreadcrumb />);

    expect(screen.getByText(etiqueta)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: etiqueta })).toBeNull();
  });

  it('los segmentos que sí tienen página siguen siendo links', () => {
    mockPathname.mockReturnValue('/content/modules-tree/module/abc-123');

    render(<AppBreadcrumb />);

    expect(screen.getByRole('link', { name: 'Módulos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contenido' })).toBeInTheDocument();
  });
});
