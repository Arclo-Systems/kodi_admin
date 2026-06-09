'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { parseYMD, toYMD } from '@/components/ui/date-picker';

const fmt = (d: Date) => d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });

// Rango como dos strings 'YYYY-MM-DD' (from/to). onChange devuelve ambos ('' si falta alguno).
export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = 'Elegí un rango',
  disabled,
  className,
  'aria-label': ariaLabel,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const range: DateRange | undefined =
    from || to ? { from: parseYMD(from), to: parseYMD(to) } : undefined;
  const label = range?.from
    ? range.to
      ? `${fmt(range.from)} → ${fmt(range.to)}`
      : fmt(range.from)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'w-full justify-start font-normal',
            !range?.from && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          locale={es}
          numberOfMonths={2}
          selected={range}
          onSelect={(r) => onChange(r?.from ? toYMD(r.from) : '', r?.to ? toYMD(r.to) : '')}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
