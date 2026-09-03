'use client';

import { ChevronDownIcon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type ModuleOption = { id: string; shortName: string };

/**
 * Selector de varios módulos.
 *
 * Armado con `DropdownMenuCheckboxItem` en vez de un combobox: el panel no tiene
 * `command`/`cmdk` vendorizado y un país tiene 5 módulos, no 500 — una lista de
 * checks se lee de una y no hace falta buscador.
 */
export function ModuleMultiSelect({
  options,
  value,
  onChange,
  invalid,
  disabled,
}: {
  options: ModuleOption[];
  value: string[];
  onChange: (next: string[]) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const seleccionados = options.filter((m) => value.includes(m.id));

  function toggle(id: string): void {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  }

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid}
            aria-label="Elegir módulos"
            className={cn(
              'w-full justify-between font-normal',
              seleccionados.length === 0 && 'text-muted-foreground',
            )}
          >
            {seleccionados.length === 0
              ? 'Elegí los módulos'
              : `${seleccionados.length} ${seleccionados.length === 1 ? 'módulo' : 'módulos'}`}
            <ChevronDownIcon className="size-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
          {options.map((m) => (
            <DropdownMenuCheckboxItem
              key={m.id}
              checked={value.includes(m.id)}
              // Sin esto el menú se cierra al primer check y hay que reabrirlo
              // por cada módulo: justo lo que este control viene a evitar.
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => toggle(m.id)}
            >
              {m.shortName}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {seleccionados.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {seleccionados.map((m) => (
            <li key={m.id}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {m.shortName}
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  aria-label={`Quitar ${m.shortName}`}
                  className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
