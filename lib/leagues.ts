// Identidad visual de las ligas (Kodi). Los badges son arte propio en /public/app_assets;
// el color de cada liga sale del propio badge (bronce → plata → oro → morado), no inventado.
export type LeagueTier = 'aprendiz' | 'avanzado' | 'experto' | 'genio';

export type LeagueMeta = {
  label: string;
  /** Color de identidad de la liga (derivado del badge). Para tints/acentos, no texto chico. */
  color: string;
  /** Ruta servida del badge (webp en public/app_assets). */
  asset: string;
};

export const LEAGUE_META: Record<LeagueTier, LeagueMeta> = {
  aprendiz: { label: 'Aprendiz', color: '#B5722E', asset: '/app_assets/aprendiz.webp' }, // bronce
  avanzado: { label: 'Avanzado', color: '#7C8698', asset: '/app_assets/avanzado.webp' }, // plata
  experto: { label: 'Experto', color: '#D29A1F', asset: '/app_assets/experto.webp' }, // oro
  genio: { label: 'Genio', color: '#7C5CCF', asset: '/app_assets/genio.webp' }, // morado (color real del asset)
};

const FALLBACK: LeagueMeta = { label: '—', color: 'var(--muted-foreground)', asset: '' };

export function leagueMeta(tier: string): LeagueMeta {
  return LEAGUE_META[tier as LeagueTier] ?? { ...FALLBACK, label: tier };
}
