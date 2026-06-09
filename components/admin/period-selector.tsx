'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type PeriodValue = 'today' | '7d' | '30d' | '90d' | 'custom';

export type PeriodSelectorProps = {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
};

export function PeriodSelector(props: PeriodSelectorProps) {
  return (
    <Select value={props.value} onValueChange={(v) => props.onChange(v as PeriodValue)}>
      <SelectTrigger className="w-fit" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="today">Hoy</SelectItem>
        <SelectItem value="7d">Últimos 7 días</SelectItem>
        <SelectItem value="30d">Últimos 30 días</SelectItem>
        <SelectItem value="90d">Últimos 90 días</SelectItem>
        <SelectItem value="custom">Personalizado</SelectItem>
      </SelectContent>
    </Select>
  );
}

// Convierte un PeriodValue a rango de fechas.
export function periodToRange(
  period: PeriodValue,
  custom?: { from: Date; to: Date },
): { from: Date; to: Date } {
  const now = new Date();
  if (period === 'custom' && custom) return custom;
  if (period === 'today') {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return { from: new Date(now.getTime() - days * 86_400_000), to: now };
}
