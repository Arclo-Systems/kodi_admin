// Premio en las tres monedas de Kodi, compartido por logros y misiones (mismas reglas,
// mismo formato). Cualquiera puede ir en 0; si van las tres, el premio es honor puro
// (ej. el logro Fundador) y se muestra "—", no tres ceros.
type Reward = { xpReward: number; kokosReward: number; kolonesReward: number };

export function rewardLabel(r: Reward): string {
  const parts: string[] = [];
  if (r.xpReward > 0) parts.push(`${r.xpReward.toLocaleString('es-CR')} XP`);
  if (r.kokosReward > 0) parts.push(`${r.kokosReward.toLocaleString('es-CR')} Kokos`);
  if (r.kolonesReward > 0) parts.push(`${r.kolonesReward.toLocaleString('es-CR')} Kolones`);
  return parts.join(' · ') || '—';
}
