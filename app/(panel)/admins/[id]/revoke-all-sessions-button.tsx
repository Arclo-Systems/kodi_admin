'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';

// Botón "cerrar todas mis sesiones". Aparte de SessionsList para poder vivir en el header
// del page (server) junto a la descripción, sin acoplar la tabla.
export function RevokeAllSessionsButton() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  async function revokeAll(): Promise<void> {
    const res = await fetch('/api/admin/auth/sessions/revoke-all', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('No se pudieron cerrar las sesiones');
    toast.success('Todas las sesiones fueron cerradas');
    qc.invalidateQueries({ queryKey: ['admin-sessions', 'me'] });
  }

  return (
    <>
      <Button size="sm" variant="destructive" className="shrink-0" onClick={() => setOpen(true)}>
        <LogOutIcon className="size-4" /> Cerrar todas las sesiones
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => !o && setOpen(false)}
        title="Cerrar todas las sesiones"
        description="Se cerrarán tus sesiones en todos los dispositivos; tendrás que volver a iniciar sesión."
        destructive
        confirmLabel="Cerrar todas"
        onConfirm={async () => {
          await revokeAll();
        }}
      />
    </>
  );
}
