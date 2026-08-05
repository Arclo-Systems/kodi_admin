'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ctaShadowColor } from '@/lib/email-contrast';
import type { MessageChannel } from '@/hooks/use-message-templates';
import { useEmailBrand, type EmailBrand } from '@/hooks/use-email-brand';
import { InboxHeader } from '@/components/admin/inbox-header';

// Espeja COLOR.wordmark de base.layout.ts del backend: el email lo pinta como
// texto inline, no como SVG, y ese gris no existe como token del panel.
const EMAIL_WORDMARK_COLOR = '#A8B5BD';

// Mapeo de los presets del backend a clases de tamaño del panel. El preview es
// fiel, no idéntico: importa que se note chico/mediano/grande, no clavar el px.
const HEADLINE_CLASS = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' } as const;
const MASCOT_CLASS = { sm: 'size-20', md: 'size-28', lg: 'size-36' } as const;

type StructuredEmailFields = {
  headline?: string;
  assetUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryText?: string;
};

type MessagePreviewProps = {
  channel: MessageChannel;
  subject: string;
  body: string;
} & StructuredEmailFields;

// Previsualización en vivo de un mensaje, imitando lo que recibe el usuario:
// - push: tarjeta de notificación de teléfono (ícono = icon.svg de la marca).
// - email "simple" (1-a-1): asunto + cuerpo plano.
// - email "estructurado" (broadcast): layout tipo Duolingo (hero, título, CTA teal,
//   secundario, footer con redes), fiel al render del backend (fiel, no idéntico).
// Texto plano en todos lados → React auto-escapa (espejo del escapeHtml del backend).
export function MessagePreview(props: MessagePreviewProps) {
  if (props.channel === 'push') return <PushPreview subject={props.subject} body={props.body} />;

  const isStructured =
    props.headline !== undefined ||
    props.assetUrl !== undefined ||
    props.ctaLabel !== undefined ||
    props.ctaUrl !== undefined ||
    props.secondaryText !== undefined;

  return (
    <div className="overflow-hidden rounded-lg border">
      <InboxHeader subject={props.subject} />
      {isStructured ? <DuolingoCanvas {...props} /> : <SimpleBody body={props.body} />}
    </div>
  );
}

function SimpleBody({ body }: { body: string }) {
  return (
    <div className="min-h-24 px-4 py-4 text-sm whitespace-pre-wrap">
      {body.trim() || <span className="text-muted-foreground italic">(cuerpo vacío)</span>}
    </div>
  );
}

function DuolingoCanvas({ headline, assetUrl, body, ctaLabel, secondaryText }: MessagePreviewProps) {
  const { data: brand } = useEmailBrand();

  // Lo que el destinatario va a ver = lo configurado, y si no hay nada, el default
  // que reporta el backend. El panel no inventa ninguno de los dos valores.
  const mascotUrl = brand?.mascotUrl ?? brand?.defaults.mascotUrl;
  const headlineColor = brand?.headlineColor ?? brand?.defaults.headlineColor;
  const headlineSize = brand?.headlineSize ?? brand?.defaults.headlineSize ?? 'md';
  const mascotSize = brand?.mascotSize ?? brand?.defaults.mascotSize ?? 'md';

  // `email-canvas` (globals.css) fija los tokens en claro: el correo real
  // siempre sale sobre blanco y sus colores de marca están afinados contra ese
  // fondo — seguir el tema oscuro del panel los volvía ilegibles y el preview
  // dejaba de parecerse a lo que recibe el usuario.
  return (
    <div className="email-canvas bg-card text-card-foreground px-6 py-8 text-center">
      <Wordmark url={brand?.wordmarkUrl} />
      <Hero assetUrl={assetUrl} mascotUrl={mascotUrl} sizeClass={MASCOT_CLASS[mascotSize]} />
      <div
        className={cn(
          'text-foreground mt-5 leading-snug font-extrabold tracking-tight',
          HEADLINE_CLASS[headlineSize],
        )}
        style={headlineColor ? { color: headlineColor } : undefined}
      >
        {headline?.trim() || <span className="text-muted-foreground font-normal italic">(título)</span>}
      </div>
      <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-relaxed whitespace-pre-wrap">
        {body.trim() || <span className="italic">(cuerpo vacío)</span>}
      </p>
      <CtaPill
        label={ctaLabel}
        color={brand?.ctaColor ?? brand?.defaults.ctaColor}
        defaultColor={brand?.defaults.ctaColor}
      />
      {secondaryText?.trim() && (
        <p className="text-muted-foreground mx-auto mt-4 max-w-sm text-xs leading-relaxed">
          {secondaryText.trim()}
        </p>
      )}
      <div className="my-6 border-t" />
      <SocialRow links={brand} />
      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        © Kodi — Estudiá. Competí. Aprobá.
        <br />
        Este es un mensaje automático. Si no esperabas este email, podés ignorarlo.
      </p>
    </div>
  );
}

// Encabezado: el logo configurado o, sin él, el wordmark de texto de siempre —
// exactamente la misma decisión que toma `renderWordmark` en el backend.
function Wordmark({ url }: { url?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Kodi"
        loading="lazy"
        onError={() => setFailed(true)}
        className="mx-auto mb-7 h-7 w-auto object-contain"
      />
    );
  }
  return (
    <div
      className="mx-auto mb-7 text-sm font-medium tracking-wide"
      style={{ color: EMAIL_WORDMARK_COLOR }}
    >
      kodi.
    </div>
  );
}

function Hero({
  assetUrl,
  mascotUrl,
  sizeClass,
}: {
  assetUrl?: string;
  mascotUrl?: string;
  sizeClass: string;
}) {
  // La mascota vive en R2 y su URL la resuelve el backend; si no carga (bucket
  // caído, sin red) degradamos al placeholder en vez de dejar un ícono roto.
  const [mascotFailed, setMascotFailed] = useState(false);
  const custom = assetUrl?.trim();

  // Origen arbitrario (la URL la escribe el admin) → next/image exigiría remotePatterns por host;
  // <img> es la herramienta correcta para previsualizar una URL externa cualquiera.
  if (custom) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={custom}
        alt="Imagen principal del email"
        loading="lazy"
        className={cn('mx-auto object-contain', sizeClass)}
      />
    );
  }
  if (mascotUrl && !mascotFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mascotUrl}
        alt="Mascota"
        loading="lazy"
        onError={() => setMascotFailed(true)}
        className={cn('mx-auto object-contain', sizeClass)}
      />
    );
  }
  return (
    <div
      className={cn(
        'bg-muted text-muted-foreground mx-auto flex flex-col items-center justify-center gap-1 rounded-xl',
        sizeClass,
      )}
    >
      <ImageIcon className="size-7" aria-hidden />
      <span className="text-[10px]">Mascota</span>
    </div>
  );
}

// CTA de previsualización: NO interactivo (es un preview) → <span>, no <button> (FE-2).
//
// Imita el botón real del correo, incluida la sombra 3D: el email pinta un
// `box-shadow: 0 4px 0 <sombra>` (renderCta de base.layout.ts) y sin ella el
// preview mostraba un botón plano que no era el que iba a recibir el usuario.
// La sombra sale de `ctaShadowColor` — el mismo cálculo que el backend, no un
// hex inventado ni el `shadow-sm` genérico de Tailwind.
//
// `color` ya viene resuelto (lo configurado, o el default que reporta el
// backend); mientras el GET carga no hay ninguno y se cae al token del panel.
function CtaPill({
  label,
  color,
  defaultColor,
}: {
  label?: string;
  color?: string;
  defaultColor?: string;
}) {
  const text = label?.trim();
  const shadow = color && defaultColor ? ctaShadowColor(color, defaultColor) : undefined;

  return (
    <div className="mt-7">
      <span
        role="presentation"
        className={cn(
          'inline-block rounded-xl px-8 py-3 text-sm font-bold tracking-wide uppercase',
          color ? 'text-white' : 'bg-primary text-primary-foreground shadow-sm',
          !text && 'opacity-60',
        )}
        style={
          color
            ? {
                backgroundColor: color,
                boxShadow: shadow ? `0 4px 0 ${shadow}` : undefined,
              }
            : undefined
        }
      >
        {text || 'texto del botón'}
      </span>
    </div>
  );
}

const SOCIAL_GLYPHS = {
  instagramUrl: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebookUrl: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  ),
  tiktokUrl: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  whatsappUrl: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  ),
  // "Sitio web" no es una marca: globo genérico, igual que el PNG del email real.
  websiteUrl: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  ),
} as const;

// Fail-safe del backend (`socialUrls` en email/templates/assets.ts): sin ninguna
// config guardada el correo real IGUAL sale con Instagram y Facebook, así que el
// preview tiene que mostrarlos. TikTok, WhatsApp y el sitio web nunca tuvieron
// default y quedan ocultos hasta que el admin los configure.
const DEFAULT_SOCIAL_LINKS: Partial<Record<keyof typeof SOCIAL_GLYPHS, string>> = {
  instagramUrl: 'https://instagram.com/kodi.app',
  facebookUrl: 'https://facebook.com/kodi.app',
};

// Footer con redes, decorativo (aria-hidden): glifos de marca inline en monocromo muted.
// Solo las redes con enlace, igual que el email real: las configuradas si hay
// config, y si no las hay (aún cargando, o el GET falló) las que manda el
// backend por defecto — nunca íconos que no van a salir.
function SocialRow({ links }: { links?: EmailBrand }) {
  const resolved = links ?? DEFAULT_SOCIAL_LINKS;
  const shown = (Object.keys(SOCIAL_GLYPHS) as Array<keyof typeof SOCIAL_GLYPHS>).filter((key) =>
    resolved[key]?.trim(),
  );
  if (shown.length === 0) return null;

  return (
    <div className="text-muted-foreground flex items-center justify-center gap-4" aria-hidden>
      {shown.map((key) => (
        <span key={key}>{SOCIAL_GLYPHS[key]}</span>
      ))}
    </div>
  );
}

function PushPreview({ subject, body }: { subject: string; body: string }) {
  return (
    <div className="bg-muted/40 flex items-start gap-3 rounded-xl border p-3 shadow-sm">
      <div className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg">
        <Image src="/icon.svg" alt="Kodi" width={28} height={28} className="size-7" unoptimized />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">
            {subject.trim() || (
              <span className="text-muted-foreground font-normal italic">(título)</span>
            )}
          </span>
          <span className="text-muted-foreground shrink-0 text-xs">ahora</span>
        </div>
        <div className="text-muted-foreground line-clamp-3 text-sm whitespace-pre-wrap">
          {body.trim() || <span className="italic">(cuerpo vacío)</span>}
        </div>
      </div>
    </div>
  );
}
