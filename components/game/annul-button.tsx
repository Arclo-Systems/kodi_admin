'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BanIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useAnnul, type GameEntity } from '@/hooks/use-game';

const LABEL: Record<GameEntity, string> = {
  matches: 'la partida',
  arenas: 'la arena',
  simulacros: 'el simulacro',
  'quick-modes': 'la sesión rápida',
};

export function AnnulButton({
  entity,
  id,
  disabled,
}: {
  entity: GameEntity;
  id: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const annul = useAnnul(entity);

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <BanIcon className="size-4" /> Anular
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Anular ${LABEL[entity]}`}
        description="Revierte los Kokos/Kolones otorgados (puede dejar saldo negativo) y notifica al usuario. No se puede deshacer."
        destructive
        requireReason
        reasonMinLength={3}
        confirmLabel="Anular"
        onConfirm={async ({ reason }) => {
          await annul.mutateAsync({ id, reason: reason ?? '' });
          toast.success('Anulada');
        }}
      />
    </>
  );
}
