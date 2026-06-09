'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MoreVerticalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import type { UserDetail } from '@/lib/user-detail';
import { BanAction } from './actions/ban-action';
import { AdjustBalanceAction } from './actions/adjust-balance-action';
import { EmailChangeAction } from './actions/email-change-action';
import { SendMessageAction } from './actions/send-message-action';

type ActionKey =
  | 'ban'
  | 'unban'
  | 'reset-password'
  | 'force-logout'
  | 'delete-account'
  | 'email-change'
  | 'adjust-balance'
  | 'reset-streak'
  | 'send-message'
  | 'parental-approve'
  | 'parental-reject';

export function UserActions({ user }: { user: Pick<UserDetail, 'id' | 'accountStatus' | 'isBot'> }) {
  const router = useRouter();
  const [open, setOpen] = useState<ActionKey | null>(null);

  async function simplePost(path: string, body?: object): Promise<void> {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(data.message ?? 'Error en la acción');
    }
    toast.success('Acción ejecutada');
    router.refresh();
  }

  const close = (o: boolean) => !o && setOpen(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Acciones">
            <MoreVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Soporte</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setOpen('reset-password')}>Reset password</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen('force-logout')}>Forzar logout</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen('adjust-balance')}>Ajustar balance</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen('reset-streak')}>Reset streak</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen('send-message')}>Enviar mensaje</DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Moderación</DropdownMenuLabel>
          {user.accountStatus === 'suspended' ? (
            <DropdownMenuItem onClick={() => setOpen('unban')}>Desbanear</DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onClick={() => setOpen('ban')}>
              Banear
            </DropdownMenuItem>
          )}
          {user.accountStatus === 'pending_parental' && (
            <>
              <DropdownMenuItem onClick={() => setOpen('parental-approve')}>
                Aprobar consent parental
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setOpen('parental-reject')}>
                Rechazar consent parental
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Admin only</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setOpen('email-change')}>Cambiar email</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setOpen('delete-account')}>
            Borrar cuenta
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={open === 'reset-password'}
        onOpenChange={close}
        title="Enviar email de reset de contraseña"
        description="El usuario recibirá un email con un link para resetear."
        onConfirm={() => simplePost(`/api/admin/users/${user.id}/reset-password`)}
      />
      <ConfirmDialog
        open={open === 'force-logout'}
        onOpenChange={close}
        title="Forzar logout"
        description="Invalida todos los tokens del usuario."
        destructive
        onConfirm={() => simplePost(`/api/admin/users/${user.id}/force-logout`)}
      />
      <ConfirmDialog
        open={open === 'reset-streak'}
        onOpenChange={close}
        title="Reset de racha"
        requireReason
        onConfirm={(p) => simplePost(`/api/admin/users/${user.id}/reset-streak`, { reason: p.reason })}
      />
      <ConfirmDialog
        open={open === 'unban'}
        onOpenChange={close}
        title="Desbanear usuario"
        onConfirm={() => simplePost(`/api/admin/users/${user.id}/unban`)}
      />
      <ConfirmDialog
        open={open === 'parental-approve'}
        onOpenChange={close}
        title="Aprobar consentimiento parental"
        onConfirm={() => simplePost(`/api/admin/users/${user.id}/parental-consent/approve`)}
      />
      <ConfirmDialog
        open={open === 'parental-reject'}
        onOpenChange={close}
        title="Rechazar consentimiento parental"
        description="El usuario será eliminado."
        destructive
        requireReason
        onConfirm={(p) =>
          simplePost(`/api/admin/users/${user.id}/parental-consent/reject`, { reason: p.reason })
        }
      />
      <ConfirmDialog
        open={open === 'delete-account'}
        onOpenChange={close}
        title="Borrar cuenta"
        description="Soft delete. La PII se anonimiza tras 30 días."
        destructive
        requireReason
        twoFa={{
          enabled: true,
          requestEndpoint: `/v1/admin/users/${user.id}/request-2fa`,
          action: 'user_delete_account',
        }}
        onConfirm={(p) =>
          simplePost(`/api/admin/users/${user.id}/delete-account`, {
            reason: p.reason,
            twoFaToken: p.twoFaToken,
          })
        }
      />

      {/* Sub-dialogs especializados */}
      <BanAction userId={user.id} open={open === 'ban'} onOpenChange={close} />
      <AdjustBalanceAction userId={user.id} open={open === 'adjust-balance'} onOpenChange={close} />
      <EmailChangeAction userId={user.id} open={open === 'email-change'} onOpenChange={close} />
      <SendMessageAction userId={user.id} open={open === 'send-message'} onOpenChange={close} />
    </>
  );
}
