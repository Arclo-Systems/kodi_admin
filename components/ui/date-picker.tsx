'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Trabaja con strings 'YYYY-MM-DD' (mismo contrato que <input type="date">), parseando/formateando en
// hora local para evitar corrimientos por timezone.
export function parseYMD(s: string): Date | undefined {
  return s ? new Date(`${s}T00:00:00`) : undefined;
}
export function toYMD(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const fmtShort = (d: Date) =>
  d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });

export function DatePicker({
  value,
  onChange,
  placeholder = 'Elegí una fecha',
  disabled,
  invalid,
  id,
  className,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const date = parseYMD(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid}
          aria-label={ariaLabel}
          className={cn(
            'w-full justify-start font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          {date ? fmtShort(date) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={es}
          selected={date}
          onSelect={(d) => {
            onChange(d ? toYMD(d) : '');
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
