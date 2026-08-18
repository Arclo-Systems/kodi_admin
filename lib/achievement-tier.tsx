import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AchievementTier } from '@/hooks/use-achievements';

// Rareza de logro: fuente única (tabla, form, detalle, filtros y ficha de usuario) —
// antes los strings vivían repetidos en los cuatro.
// Los colores NO son una escalera inventada: son los que ya trae grabada la medalla
// en la app (`frontend/assets/logros/<rareza>/*.webp`) — verde, celeste, morado,
// dorado. El panel los repite para que la ficha y la medalla no se contradigan;
// por eso acá el verde NO significa "éxito" ni el dorado "alerta".
const TIER_META: Record<AchievementTier, { label: string; badge: string }> = {
  common: { label: 'Común', badge: 'border-success/40 bg-success/15 text-success' },
  uncommon: { label: 'Poco común', badge: 'border-info/40 bg-info/15 text-info' },
  rare: { label: 'Raro', badge: 'border-morado/40 bg-morado/15 text-morado' },
  epic: { label: 'Épico', badge: 'border-warning/40 bg-warning/15 text-warning' },
  // La medalla Fundador no es de las cuatro rarezas: es madera y verde de selva.
  // `cafe` es el token de marca más cercano y además la saca del arcoíris de arriba.
  limited: { label: 'Edición limitada', badge: 'border-cafe/40 bg-cafe/15 text-cafe' },
};

export const ACHIEVEMENT_TIERS = (
  Object.entries(TIER_META) as [AchievementTier, { label: string }][]
).map(([value, meta]) => ({ value, label: meta.label }));

export function achievementTierLabel(tier: string): string {
  return TIER_META[tier as AchievementTier]?.label ?? tier;
}

/** Clases del badge; una rareza desconocida cae en el gris neutro. */
export function achievementTierBadgeClass(tier: string): string {
  return TIER_META[tier as AchievementTier]?.badge ?? 'text-muted-foreground';
}

// `tier` llega como string suelto desde la ficha de usuario (el detalle de usuario no
// tipa el enum): una rareza desconocida se muestra cruda en vez de romper.
export function AchievementTierBadge({ tier }: { tier: string }) {
  return (
    <Badge variant="outline" className={cn(achievementTierBadgeClass(tier))}>
      {achievementTierLabel(tier)}
    </Badge>
  );
}
