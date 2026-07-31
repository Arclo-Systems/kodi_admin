'use client';

import { createContext, useContext } from 'react';
import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// El detalle de nodo vive en dos sitios: el módulo en pantalla propia (necesita
// el ancho para el arte) y materia/tema en modal (son formularios cortos). El
// contenedor cambia con el sitio, no el formulario.
//
// No alcanza con divs neutros: dentro de un diálogo el título TIENE que ser el
// de Radix, o el modal queda sin nombre accesible y Radix avisa por consola.

type Chrome = 'dialog' | 'screen';

const ChromeContext = createContext<Chrome>('screen');

export function NodeChrome({
  variant,
  children,
}: {
  variant: Chrome;
  children: React.ReactNode;
}) {
  return <ChromeContext.Provider value={variant}>{children}</ChromeContext.Provider>;
}

export function NodeHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const chrome = useContext(ChromeContext);
  if (chrome === 'dialog') return <DialogHeader className={className} {...props} />;
  return <div className={cn('flex flex-col gap-2', className)} {...props} />;
}

export function NodeTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  const chrome = useContext(ChromeContext);
  if (chrome === 'dialog') return <DialogTitle className={className} {...props} />;
  return (
    <h2
      className={cn('font-heading text-base leading-none font-medium', className)}
      {...props}
    />
  );
}

export function NodeFooter({ className, ...props }: React.ComponentProps<'div'>) {
  const chrome = useContext(ChromeContext);
  if (chrome === 'dialog') return <DialogFooter className={className} {...props} />;
  // En pantalla compensa el padding de la Card para quedar pegado al borde,
  // igual que el pie del modal.
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
