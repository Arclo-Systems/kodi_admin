/**
 * Paleta oficial de marca para los colores que el panel escribe como hex crudo (sectores de la
 * ruleta, identidad de materias y temas). Espejo de `frontend/src/theme/colors.ts` → `BRAND`:
 * si cambia allá, cambia acá.
 *
 * No reemplaza a los tokens semánticos de shadcn — el markup del panel sigue yendo con
 * `bg-primary`/`text-muted-foreground`. Esto es DATO: colores que viajan a la base y los pinta
 * la app.
 */
export const KODI_PALETTE: readonly { name: string; hex: string }[] = [
  { name: 'Teal', hex: '#408D99' },
  { name: 'Coral', hex: '#F47C6B' },
  { name: 'Lima', hex: '#9BCB6C' },
  { name: 'Cielo', hex: '#5DB7E8' },
  { name: 'Dorado', hex: '#E3B23C' },
  { name: 'Ámbar', hex: '#F4A261' },
  { name: 'Morado', hex: '#B79AE8' },
  { name: 'Durazno', hex: '#F6B38E' },
];
