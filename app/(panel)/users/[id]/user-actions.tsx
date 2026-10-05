'use client';

import { Fragment, useState } from 'react';
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
import type { AdminRole } from '@/lib/auth';
import { canWithScope, type Action } from '@/lib/permissions';
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
  | 'parental-reject'
  | 'reset-cosmetic';

type MenuAction = { key: ActionKey; label: string; permission: Action; destructive?: boolean };
type MenuSection = { label: string; actions: MenuAction[] };

type MenuUser = Pick<UserDetail, 'id' | 'accountStatus' | 'isBot'>;

function menuSections(user: MenuUser): MenuSection[] {
  return [
    {
      label: 'Soporte',
      actions: [
        { key: 'reset-password', label: 'Reset password', permission: 'user:reset-password' },
        { key: 'force-logout', label: 'Forzar logout', permission: 'user:force-logout' },
        { key: 'adjust-balance', label: 'Ajustar balance', permission: 'user:adjust-balance' },
        { key: 'reset-streak', label: 'Reset streak', permission: 'user:reset-streak' },
        { key: 'send-message', label: 'Enviar mensaje', permission: 'messaging:send' },
      ],
    },
    {
      label: 'Moderación',
      actions: [
        user.accountStatus === 'suspended'
          ? { key: 'unban', label: 'Desbanear', permission: 'user:ban' }
          : { key: 'ban', label: 'Banear', permission: 'user:ban', destructive: true },
        ...(user.accountStatus === 'pending_parental'
          ? ([
              { key: 'parental-approve', label: 'Aprobar consent parental', permission: 'user:parental-consent' },
              {
                key: 'parental-reject',
                label: 'Rechazar consent parental',
                permission: 'user:parental-consent',
                destructive: true,
              },
            ] satisfies MenuAction[])
          : []),
        { key: 'reset-cosmetic', label: 'Reset cosmético', permission: 'user:reset-cosmetic', destructive: true },
      ],
    },
    {
      label: 'Admin only',
      actions: [
        { key: 'email-change', label: 'Cambiar email', permission: 'user:email-change' },
        { key: 'delete-account', label: 'Borrar cuenta', permission: 'user:delete', destructive: true },
      ],
    },
  ];
}

// El menú es gating de UX: muestra solo lo que el backend le aceptaría a este admin.
function visibleSections(user: MenuUser, role: AdminRole, isGlobalScope: boolean): MenuSection[] {
  return menuSections(user)
    .map((section) => ({
      ...section,
      actions: section.actions.filter((a) => canWithScope(role, isGlobalScope, a.permission)),
    }))
    .filter((section) => section.actions.length > 0);
}

export function UserActions({
  user,
  role,
  isGlobalScope,
}: {
  user: MenuUser;
  role: AdminRole;
  isGlobalScope: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<ActionKey | null>(null);
  const sections = visibleSections(user, role, isGlobalScope);

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

  if (sections.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Acciones">
            <MoreVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {sections.map((section, i) => (
            <Fragment key={section.label}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{section.label}</DropdownMenuLabel>
              {section.actions.map((a) => (
                <DropdownMenuItem
                  key={a.key}
                  variant={a.destructive ? 'destructive' : 'default'}
                  onClick={() => setOpen(a.key)}
                >
                  {a.label}
                </DropdownMenuItem>
              ))}
            </Fragment>
          ))}
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
        open={open === 'reset-cosmetic'}
        onOpenChange={close}
        title="Reset cosmético"
        description="Vuelve el nombre visible a uno genérico y quita título, avatar, marco y foto de perfil."
        destructive
        onConfirm={() => simplePost(`/api/admin/users/${user.id}/reset-cosmetic`)}
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
