import { EMAIL_SENDER } from '@/lib/tx-templates';

// "Kodi <soporte@holakodi.com>" → nombre + dirección, para pintarlos con el
// mismo contraste que les da una bandeja real (el nombre pesa, la dirección no).
const SENDER = /^(.*?)\s*<(.+)>$/.exec(EMAIL_SENDER);
const SENDER_NAME = SENDER?.[1] ?? EMAIL_SENDER;
const SENDER_EMAIL = SENDER?.[2];

/**
 * Encabezado tipo bandeja (Gmail): remitente + asunto. Compartido por el preview
 * del composer y el de los transaccionales — el asunto es lo primero que decide
 * si el correo se abre, así que se previsualiza siempre junto al cuerpo.
 */
export function InboxHeader({ subject }: { subject: string }) {
  return (
    <div className="bg-muted/50 space-y-1 border-b px-4 py-3">
      <div className="text-muted-foreground text-xs">
        {SENDER_NAME}
        {SENDER_EMAIL && <span className="opacity-70"> &lt;{SENDER_EMAIL}&gt;</span>}
      </div>
      <div className="text-sm font-medium">
        {subject.trim() || <span className="text-muted-foreground italic">(sin asunto)</span>}
      </div>
    </div>
  );
}
