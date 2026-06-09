import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageChannel } from '@/hooks/use-message-templates';

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

// Encabezado tipo bandeja (Gmail): remitente + asunto. Compartido por email simple y estructurado.
function InboxHeader({ subject }: { subject: string }) {
  return (
    <div className="bg-muted/50 space-y-1 border-b px-4 py-3">
      <div className="text-muted-foreground text-xs">
        Kodi <span className="opacity-70">&lt;info@kodi.app&gt;</span>
      </div>
      <div className="text-sm font-medium">
        {subject.trim() || <span className="text-muted-foreground italic">(sin asunto)</span>}
      </div>
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
  return (
    <div className="bg-background px-6 py-8 text-center">
      <Image src="/wordmark.svg" alt="Kodi" width={49} height={16} unoptimized className="mx-auto mb-7 h-4 w-auto" />
      <Hero assetUrl={assetUrl} />
      <div className="text-foreground mt-5 text-lg leading-snug font-extrabold tracking-tight">
        {headline?.trim() || <span className="text-muted-foreground font-normal italic">(título)</span>}
      </div>
      <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-relaxed whitespace-pre-wrap">
        {body.trim() || <span className="italic">(cuerpo vacío)</span>}
      </p>
      <CtaPill label={ctaLabel} />
      {secondaryText?.trim() && (
        <p className="text-muted-foreground mx-auto mt-4 max-w-sm text-xs leading-relaxed">
          {secondaryText.trim()}
        </p>
      )}
      <div className="my-6 border-t" />
      <SocialRow />
      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">© Kodi — Estudiá. Competí. Aprobá.</p>
    </div>
  );
}

function Hero({ assetUrl }: { assetUrl?: string }) {
  if (assetUrl?.trim()) {
    // Origen arbitrario (la URL la escribe el admin) → next/image exigiría remotePatterns por host;
    // <img> es la herramienta correcta para previsualizar una URL externa cualquiera.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={assetUrl} alt="Imagen principal del email" loading="lazy" className="mx-auto size-28 object-contain" />;
  }
  return (
    <div className="bg-muted text-muted-foreground mx-auto flex size-28 flex-col items-center justify-center gap-1 rounded-xl">
      <ImageIcon className="size-7" aria-hidden />
      <span className="text-[10px]">Koko (por defecto)</span>
    </div>
  );
}

// CTA de previsualización: NO interactivo (es un preview) → <span>, no <button> (FE-2). Imita el
// botón real: pill teal de marca (bg-primary) con sombra 3D derivada del token (no un hex inventado).
function CtaPill({ label }: { label?: string }) {
  const text = label?.trim();
  return (
    <div className="mt-7">
      <span
        role="presentation"
        className={cn(
          'bg-primary text-primary-foreground inline-block rounded-xl px-8 py-3 text-sm font-bold tracking-wide uppercase shadow-sm',
          !text && 'opacity-60',
        )}
      >
        {text || 'texto del botón'}
      </span>
    </div>
  );
}

// Footer con redes, decorativo (aria-hidden): glifos de marca inline en monocromo muted.
function SocialRow() {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-4" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
      </svg>
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
      </svg>
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
