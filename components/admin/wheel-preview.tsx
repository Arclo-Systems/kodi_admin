// Réplica web ESTÁTICA de la ruleta de la Partida Kodi, para armarla desde el panel.
//
// ESPEJO de `frontend/src/components/duels/RouletteWheel.tsx` (geometría) y de
// `frontend/src/components/duels/duelSubjectMap.ts` (colores de respaldo): si cambian allá,
// cambian acá — y al revés. Lo único que NO se replica es el giro: en el panel la ruleta va
// quieta (decisión R3 del diseño).

import { cn } from '@/lib/utils';

// ─── Constantes espejo de RouletteWheel.tsx ─────────────────────────────────
// Botón central: arte propio con viewBox 25×28 y el centro de su círculo en y=15.5.
const PIN_RATIO = 0.27;
const PIN_ASPECT = 28 / 25;
const PIN_CENTER_Y = 15.5 / 28;
// Cada sector invade un pelo al siguiente para que no se cuele una hebra del fondo.
const SECTOR_OVERLAP = 0.6;
// Filo oscuro del propio color en el arco exterior: el sector completo en el tono profundo y
// encima el mismo con el radio reducido.
const RIM_RATIO = 0.023;
const RIM_DARKEN = 0.21;
// El arte del sector va a media distancia entre el botón y el borde, girado al eje de su
// sector para quedar derecho bajo el puntero.
const CROWN_ART_RATIO = 0.2;
const CROWN_ART_ORBIT = 0.62;
const RING_RATIO = 0.026;
const RING_MIN = 5;
const RIM_MIN = 2;
// Filo gris a los dos lados del aro: el blanco solo se funde con los fondos claros.
const RING_LINE_W = 1;
const WHITE = '#FEFEFE'; // COLORS.brand.blanco
const RING_LINE = '#C9D0D6'; // COLORS.light.border.default

// Espejo de duelSubjects.ts: morado es el único matiz de la paleta que no ocupa ninguna materia.
const CROWN_FALLBACK_COLOR = '#B79AE8'; // COLORS.brand.morado
const CROWN_FALLBACK_ART = '/duelo/corona.svg';
const CROWN_KEY = 'corona'; // espejo de CROWN_SECTOR_ID
const PIN_ART = '/duelo/girar.svg';

// Espejo de duelSubjectMap.ts: respaldo cuando la categoría no trae color del panel. Se recorre
// por POSICIÓN para que dos sectores vecinos nunca coincidan.
const FALLBACK_COLORS: readonly [string, ...string[]] = [
  '#F47C6B', // coral
  '#5DB7E8', // cielo
  '#9BCB6C', // lima
  '#E3B23C', // dorado
  '#F4A261', // warning
  '#408D99', // primary
];

function fallbackColor(index: number): string {
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? FALLBACK_COLORS[0];
}

// Espejo de duels.service.ts (`buildMatchCategories`): el tope del módulo nunca corta por debajo
// de 2 sectores.
const MIN_CAP = 2;
/** Default de `duelCategoryCap` en el modelo de módulo. */
const DEFAULT_CAP = 6;

const DEFAULT_SIZE = 280;

export interface WheelPreviewSector {
  id: string;
  name: string;
  color?: string | null;
  assetUrl?: string | null;
}

export interface WheelPreviewCrown {
  assetUrl?: string | null;
  colorHex?: string | null;
}

interface WheelPreviewProps {
  /** Categorías del módulo (materias o temas) en su orden de catálogo. */
  sectors: WheelPreviewSector[];
  /** Config global de la corona; sin ella se usa el arte local y el morado de marca. */
  crown?: WheelPreviewCrown;
  /** `duelCategoryCap` del módulo. */
  cap?: number;
  size?: number;
}

type DrawnSector = {
  key: string;
  label: string;
  color: string;
  assetUrl: string | null;
};

export function WheelPreview({
  sectors,
  crown,
  cap = DEFAULT_CAP,
  size = DEFAULT_SIZE,
}: WheelPreviewProps) {
  const drawn: DrawnSector[] = [
    ...sectors.slice(0, Math.max(MIN_CAP, cap)).map((sector, index) => ({
      key: sector.id,
      label: sector.name,
      color: sector.color || fallbackColor(index),
      assetUrl: sector.assetUrl ?? null,
    })),
    {
      key: CROWN_KEY,
      label: 'la corona',
      color: crown?.colorHex || CROWN_FALLBACK_COLOR,
      assetUrl: crown?.assetUrl || CROWN_FALLBACK_ART,
    },
  ];

  const sectorAngle = 360 / drawn.length;
  const radius = size / 2;
  const ringWidth = Math.max(RING_MIN, Math.round(size * RING_RATIO));
  const rimWidth = Math.max(RIM_MIN, Math.round(size * RIM_RATIO));
  // El disco de colores termina donde empieza el aro: si llegara al borde, el aro taparía el
  // filo oscuro de cada sector.
  const discRadius = radius - ringWidth;
  const pinWidth = size * PIN_RATIO;
  const pinHeight = pinWidth * PIN_ASPECT;
  const artSize = size * CROWN_ART_RATIO;

  const names = drawn.map((s) => s.label);
  const label =
    names.length > 1
      ? `Ruleta de la Partida Kodi: ${names.slice(0, -1).join(', ')} y ${names.at(-1)}`
      : `Ruleta de la Partida Kodi: ${names[0]}`;

  return (
    <div
      role="img"
      aria-label={label}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden focusable="false">
        {drawn.map((sector, i) => (
          <SectorShape
            key={`rim-${sector.key}`}
            slot="wheel-sector-rim"
            single={drawn.length === 1}
            cx={radius}
            cy={radius}
            r={discRadius}
            startDeg={i * sectorAngle}
            endDeg={(i + 1) * sectorAngle + SECTOR_OVERLAP}
            fill={darken(sector.color, RIM_DARKEN)}
          />
        ))}
        {drawn.map((sector, i) => (
          <SectorShape
            key={sector.key}
            slot="wheel-sector"
            single={drawn.length === 1}
            cx={radius}
            cy={radius}
            r={discRadius - rimWidth}
            startDeg={i * sectorAngle}
            endDeg={(i + 1) * sectorAngle + SECTOR_OVERLAP}
            fill={sector.color}
          />
        ))}
      </svg>

      {drawn.map((sector, i) => {
        if (sector.assetUrl === null) return null;
        const angle = i * sectorAngle + sectorAngle / 2;
        const at = polar(radius, radius, discRadius * CROWN_ART_ORBIT, angle);
        return (
          <WheelArt
            key={`art-${sector.key}`}
            slot={sector.key === CROWN_KEY ? 'wheel-crown-art' : 'wheel-sector-art'}
            src={sector.assetUrl}
            style={{
              width: artSize,
              height: artSize,
              left: at.x - artSize / 2,
              top: at.y - artSize / 2,
              transform: `rotate(${angle}deg)`,
            }}
          />
        );
      })}

      {/* Anillo blanco sobre el borde de los sectores */}
      <Ring size={size} width={ringWidth} color={WHITE} />
      {/* Filo gris exterior del aro */}
      <Ring size={size} width={RING_LINE_W} color={RING_LINE} />
      {/* Filo gris interior, donde el aro toca los sectores */}
      <Ring
        size={size - (ringWidth - RING_LINE_W) * 2}
        width={RING_LINE_W}
        color={RING_LINE}
        offset={ringWidth - RING_LINE_W}
      />

      {/* Botón central: no rota con la ruleta. La punta sobresale hacia arriba y es la que
          marca la materia. */}
      <WheelArt
        slot="wheel-pin"
        src={PIN_ART}
        className="z-2"
        style={{
          width: pinWidth,
          height: pinHeight,
          left: radius - pinWidth / 2,
          top: radius - pinHeight * PIN_CENTER_Y,
        }}
      />
    </div>
  );
}

/**
 * Arte decorativo de la ruleta: tamaño y posición se calculan en runtime desde `size`, y las
 * URLs remotas ya se sirven sin optimizar (mismo criterio que `AssetUpload`), así que
 * `next/image` no aportaría nada.
 */
function WheelArt({
  slot,
  src,
  style,
  className,
}: {
  slot: string;
  src: string;
  style: React.CSSProperties;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ver comentario del componente
    <img
      data-slot={slot}
      src={src}
      alt=""
      className={cn('pointer-events-none absolute object-contain', className)}
      style={style}
    />
  );
}

function Ring({
  size,
  width,
  color,
  offset = 0,
}: {
  size: number;
  width: number;
  color: string;
  offset?: number;
}) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-1 rounded-full border-solid"
      style={{
        top: offset,
        left: offset,
        width: size,
        height: size,
        borderWidth: width,
        borderColor: color,
      }}
    />
  );
}

/**
 * Un sector del disco. Con un único sector el arco degenera (arranca y termina en el mismo
 * punto), así que se dibuja el disco entero — caso que en la app no ocurre pero en el panel sí,
 * mientras el módulo todavía no tiene materias.
 */
function SectorShape({
  slot,
  single,
  cx,
  cy,
  r,
  startDeg,
  endDeg,
  fill,
}: {
  slot: string;
  single: boolean;
  cx: number;
  cy: number;
  r: number;
  startDeg: number;
  endDeg: number;
  fill: string;
}) {
  if (single) return <circle data-slot={slot} cx={cx} cy={cy} r={r} fill={fill} />;
  return <path data-slot={slot} d={sectorPath(cx, cy, r, startDeg, endDeg)} fill={fill} />;
}

/**
 * Oscurece un color para derivar su tono profundo, igual que el canto de los botones: el color
 * sigue saliendo de la paleta, no se inventa.
 */
function darken(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const full =
    c.length === 3
      ? c
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : c;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  const channel = (shift: number) =>
    Math.max(0, Math.round(((n >> shift) & 255) * (1 - amount)));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

/** Sector circular en coordenadas SVG — 0° arriba, sentido horario. */
function sectorPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
