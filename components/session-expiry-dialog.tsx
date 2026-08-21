'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from '@/lib/session-expiry';

const WARNING_WINDOW_MS = IDLE_TIMEOUT_MS - IDLE_WARNING_MS;

function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export type SessionExpiryDialogProps = {
  open: boolean;
  msLeft: number;
  isExtending: boolean;
  onExtend: () => void;
  onLogout: () => void;
};

export function SessionExpiryDialog({
  open,
  msLeft,
  isExtending,
  onExtend,
  onLogout,
}: SessionExpiryDialogProps) {
  const extendRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) extendRef.current?.focus();
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        // Cerrar por descuido (clic afuera o Esc) dejaría al admin sin aviso y perdiendo
        // lo que esté escribiendo cuando la sesión caiga: solo se sale eligiendo.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Tu sesión está por expirar</DialogTitle>
          <DialogDescription>
            Por inactividad vamos a cerrarla. Podés seguir donde estabas sin perder nada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm" aria-live="polite">
            Se cierra en{' '}
            <span className="font-medium tabular-nums">
              {formatCountdown(msLeft)}
            </span>
          </p>
          <Progress
            value={(msLeft / WARNING_WINDOW_MS) * 100}
            aria-hidden="true"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onLogout} disabled={isExtending}>
            Cerrar sesión
          </Button>
          <Button ref={extendRef} onClick={onExtend} disabled={isExtending}>
            {isExtending ? 'Extendiendo…' : 'Seguir conectado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
