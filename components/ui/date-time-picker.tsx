'use client';

import * as React from 'react';
import { CalendarIcon, XIcon } from 'lucide-react';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { parseYMD, toYMD } from '@/components/ui/date-picker';

// Trabaja con strings 'YYYY-MM-DDTHH:mm' (mismo contrato que <input type="datetime-local">): hora local
// de pared, sin conversión de timezone. '' = sin valor. Separa fecha (calendario) y hora (input time)
// y las recombina; el consumidor sigue haciendo new Date(value).toISOString() en submit.
const DEFAULT_TIME = '12:00';
const fmtShort = (d: Date) =>
  d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Elegí fecha y hora',
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
  const datePart = value ? value.slice(0, 10) : '';
  const timePart = value ? value.slice(11, 16) : '';
  const date = parseYMD(datePart);

  const emit = (nextDate: string, nextTime: string): void => {
    onChange(nextDate ? `${nextDate}T${nextTime || DEFAULT_TIME}` : '');
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid}
            aria-label={ariaLabel}
            className={cn('min-w-0 flex-1 justify-start font-normal', !value && 'text-muted-foreground')}
          >
            <CalendarIcon className="size-4 shrink-0" />
            <span className="truncate">{date ? fmtShort(date) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={es}
            selected={date}
            onSelect={(d) => {
              emit(d ? toYMD(d) : '', timePart);
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        aria-label="Hora"
        disabled={disabled || !datePart}
        value={timePart}
        onChange={(e) => emit(datePart, e.target.value)}
        className="w-28 shrink-0 [&::-webkit-calendar-picker-indicator]:hidden"
      />
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Limpiar fecha"
          className="size-9 shrink-0"
          onClick={() => onChange('')}
        >
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  );
}
