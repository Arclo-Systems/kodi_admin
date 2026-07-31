import { cn } from '@/lib/utils';

// Cabecera y pie del detalle de nodo. Antes eran `DialogHeader`/`DialogFooter`:
// el detalle vivía dentro de un modal y con la identidad visual (color + dos
// subidas de imagen con preview por nodo) quedaba inusable. Al pasar a pantalla
// propia las piezas dejan de poder depender del contexto de Radix, así que se
// replican acá con el mismo aspecto.

export function NodeHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2', className)} {...props} />;
}

export function NodeTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('font-heading text-base leading-none font-medium', className)}
      {...props}
    />
  );
}

// Compensa el padding de la Card contenedora para quedar pegado al borde,
// igual que el pie del modal.
export function NodeFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        '-mx-6 -mb-6 mt-6 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}
