import { cn } from '@/lib/utils';

export type PlanKey = 'free' | 'basico' | 'plus' | 'pro';

// Color por tier (mismo criterio que el gráfico "Suscriptores por plan" del dashboard): cielo → teal
// → dorado. Se muestra como punto de color + label en texto normal (no chip con fondo): el color va
// en el punto, el texto queda legible siempre. Fuente única; nadie más declara estos colores.
export const PLAN_COLOR: Record<PlanKey, { label: string; dot: string }> = {
  free: { label: 'Free', dot: '#7C8698' },
  basico: { label: 'Básico', dot: '#5DB7E8' },
  plus: { label: 'Plus', dot: '#408D99' },
  pro: { label: 'Pro', dot: '#E3B23C' },
};

export function planLabel(plan: string): string {
  return PLAN_COLOR[plan as PlanKey]?.label ?? plan;
}

export function PlanBadge({ plan, className }: { plan: string; className?: string }) {
  const meta = PLAN_COLOR[plan as PlanKey] ?? PLAN_COLOR.free;
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: meta.dot }} aria-hidden />
      {meta.label}
    </span>
  );
}
