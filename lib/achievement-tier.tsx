import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AchievementTier } from '@/hooks/use-achievements';

// Rareza de logro: fuente única (tabla, form, detalle, filtros y ficha de usuario) —
// antes los strings vivían repetidos en los cuatro.
// La escalera va de menos a más excepcional por PESO visual, no por arcoíris: neutro →
// neutro sólido → cielo → teal → dorado. Se evitan lima y coral, que en el panel leen
// como éxito/error (DESIGN.md §Vida y movimiento).
const TIER_META: Record<AchievementTier, { label: string; badge: string }> = {
  common: { label: 'Común', badge: 'text-muted-foreground' },
  uncommon: { label: 'Poco común', badge: 'border-transparent bg-muted text-foreground' },
  rare: { label: 'Raro', badge: 'border-info/40 bg-info/15 text-info' },
  epic: { label: 'Épico', badge: 'border-primary/40 bg-primary/15 text-primary' },
  // Dorado = honor / logros / premium en la marca; la cima de la escalera.
  limited: { label: 'Edición limitada', badge: 'border-warning/40 bg-warning/15 text-warning' },
};

export const ACHIEVEMENT_TIERS = (
  Object.entries(TIER_META) as [AchievementTier, { label: string }][]
).map(([value, meta]) => ({ value, label: meta.label }));

// El filtro de listado del backend (ListAchievementsSchema) todavía no acepta 'limited':
// ofrecerlo daría 400. Se filtra acá hasta que el backend lo agregue.
export const ACHIEVEMENT_TIER_FILTERS = ACHIEVEMENT_TIERS.filter((t) => t.value !== 'limited');

export function achievementTierLabel(tier: string): string {
  return TIER_META[tier as AchievementTier]?.label ?? tier;
}

// `tier` llega como string suelto desde la ficha de usuario (el detalle de usuario no
// tipa el enum): una rareza desconocida se muestra cruda en vez de romper.
export function AchievementTierBadge({ tier }: { tier: string }) {
  const meta = TIER_META[tier as AchievementTier];
  return (
    <Badge variant="outline" className={cn(meta?.badge ?? 'text-muted-foreground')}>
      {achievementTierLabel(tier)}
    </Badge>
  );
}
