import type { Achievement } from '@/hooks/use-achievements';

type AchievementReward = Pick<Achievement, 'xpReward' | 'kokosReward' | 'kolonesReward'>;

// El premio de un logro son tres monedas (backend 2026-08-11), y cualquiera puede ir en 0.
// Un logro sin premio es honor puro (ej. Fundador): se muestra "—", no tres ceros.
export function achievementRewardLabel(a: AchievementReward): string {
  const parts: string[] = [];
  if (a.xpReward > 0) parts.push(`${a.xpReward.toLocaleString('es-CR')} XP`);
  if (a.kokosReward > 0) parts.push(`${a.kokosReward.toLocaleString('es-CR')} Kokos`);
  if (a.kolonesReward > 0) parts.push(`${a.kolonesReward.toLocaleString('es-CR')} Kolones`);
  return parts.join(' · ') || '—';
}
