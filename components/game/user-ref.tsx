import Link from 'next/link';
import { cn } from '@/lib/utils';

// Referencia a un usuario en los detalles de juego: nombre clickeable (→ /users/:id) para
// abrir su detalle. El link ya identifica al usuario, así que no se muestra el id.
export function UserRef({
  id,
  name,
  isBot,
  className,
}: {
  id: string;
  name: string;
  isBot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      <Link href={`/users/${id}`} className="text-primary hover:underline">
        {name}
      </Link>
      {isBot && <span className="text-muted-foreground text-xs">(bot)</span>}
    </span>
  );
}
