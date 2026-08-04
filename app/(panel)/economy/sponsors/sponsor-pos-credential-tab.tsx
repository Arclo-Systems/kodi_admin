'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  CheckIcon,
  CircleCheckIcon,
  CircleOffIcon,
  CopyIcon,
  KeyRoundIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { useSponsor, useRotatePosCredential } from '@/hooks/use-sponsors';
import { StatusBadge } from '@/lib/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { TwoFaDialog } from '@/components/admin/two-fa-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const TWO_FA_ACTION = 'rotate_pos_credential';

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString('es-CR', { dateStyle: 'long', timeStyle: 'short' });
}

export function SponsorPosCredentialTab({
  sponsorId,
  canWrite,
}: {
  sponsorId: string;
  canWrite: boolean;
}) {
  const { data: sponsor, isLoading, isError } = useSponsor(sponsorId);
  const rotate = useRotatePosCredential(sponsorId);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const rotatedAt = sponsor?.merchantSecretRotatedAt ?? null;

  async function issueCredential(twoFaToken: string | undefined): Promise<void> {
    if (!twoFaToken) {
      // El diálogo siempre debería traer el código; sin él el backend responde 401
      // y el error se leería como "la credencial falló", no como "faltó el 2FA".
      const msg = 'Falta el código 2FA: pedilo y volvé a confirmar.';
      toast.error(msg);
      throw new Error(msg);
    }
    const wasEnabled = rotatedAt !== null;
    const credential = await rotate.mutateAsync(twoFaToken);
    setSecret(credential.secret);
    toast.success(wasEnabled ? 'Credencial rotada' : 'Credencial generada');
  }

  async function copyValue(key: string, text: string, message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(message);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Sin permiso de portapapeles (o contexto no seguro): el texto queda seleccionable.
      toast.error('No se pudo copiar. Seleccioná el texto y copialo a mano.');
    }
  }

  // El secreto en claro solo existe en la respuesta de la rotación: al cerrar hay
  // que borrarlo del estado Y de la MutationCache (vive ahí hasta el gcTime).
  function closeSecret(): void {
    setSecret(null);
    setCopiedKey(null);
    rotate.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRoundIcon className="text-primary size-4" />
          Credencial del POS
        </CardTitle>
        <CardDescription>
          La caja del comercio manda el ID y el secreto en cada llamada para consultar y cobrar
          cupones. Solo sirven para los cupones de este sponsor.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-9 w-44" />
          </div>
        ) : isError || !sponsor ? (
          <Alert variant="destructive">
            <AlertDescription>
              No se pudo leer el estado de la credencial. Recargá la página.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {rotatedAt ? (
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge tone="success" icon={CircleCheckIcon} label="POS habilitado" />
                <span className="text-muted-foreground text-sm">
                  Generada o rotada el {fmtDateTime(rotatedAt)}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge tone="muted" icon={CircleOffIcon} label="Sin credencial" />
                <span className="text-muted-foreground text-sm">
                  Este comercio todavía no puede cobrar cupones en caja.
                </span>
              </div>
            )}

            <CopyRow
              label="ID de comercio"
              value={sponsor.id}
              copied={copiedKey === 'merchantId'}
              onCopy={() => void copyValue('merchantId', sponsor.id, 'ID de comercio copiado')}
            />

            {canWrite &&
              (rotatedAt ? (
                <Button variant="outline" size="sm" onClick={() => setRotateOpen(true)}>
                  <RefreshCwIcon className="size-4" />
                  Rotar credencial
                </Button>
              ) : (
                <Button size="sm" onClick={() => setGenerateOpen(true)}>
                  <KeyRoundIcon className="size-4" />
                  Generar credencial
                </Button>
              ))}
          </>
        )}
      </CardContent>

      <TwoFaDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        action={TWO_FA_ACTION}
        requestEndpoint={`/v1/admin/economy/sponsors/${sponsorId}/request-2fa`}
        onVerified={issueCredential}
      />

      <ConfirmDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        title="Rotar credencial del POS"
        description="La credencial actual deja de funcionar al instante: las cajas que la usen van a fallar hasta que cargues la nueva."
        destructive
        confirmLabel="Rotar"
        twoFa={{
          enabled: true,
          action: TWO_FA_ACTION,
          requestEndpoint: `/v1/admin/economy/sponsors/${sponsorId}/request-2fa`,
        }}
        onConfirm={({ twoFaToken }) => issueCredential(twoFaToken)}
      />

      <SecretDialog
        merchantId={sponsorId}
        secret={secret}
        copiedKey={copiedKey}
        onCopy={copyValue}
        onClose={closeSecret}
      />
    </Card>
  );
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <div className="bg-muted flex items-center gap-2 rounded-md border p-3">
        <code className="min-w-0 flex-1 font-mono text-sm break-all">{value}</code>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0"
          onClick={onCopy}
          aria-label={`Copiar ${label}`}
        >
          {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

// El secreto en claro solo existe en esta respuesta: si se cierra sin copiarlo,
// la única salida es rotar de nuevo. Por eso el diálogo NO se descarta con Esc
// ni clic afuera — solo con el botón explícito.
export function SecretDialog({
  merchantId,
  secret,
  copiedKey,
  onCopy,
  onClose,
}: {
  merchantId: string;
  secret: string | null;
  copiedKey: string | null;
  onCopy: (key: string, text: string, message: string) => void;
  onClose: () => void;
}) {
  const pair = `X-Merchant-Id: ${merchantId}\nX-Merchant-Secret: ${secret}`;

  return (
    <Dialog open={!!secret} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Credencial del POS</DialogTitle>
          <DialogDescription>
            Pasale al comercio estos dos datos por un canal seguro: los manda como headers en cada
            llamada. <strong>El secreto no lo vas a volver a ver</strong> — si se pierde, hay que
            rotar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <CopyRow
            label="X-Merchant-Id"
            value={merchantId}
            copied={copiedKey === 'dialogId'}
            onCopy={() => onCopy('dialogId', merchantId, 'ID de comercio copiado')}
          />
          <CopyRow
            label="X-Merchant-Secret"
            value={secret ?? ''}
            copied={copiedKey === 'dialogSecret'}
            onCopy={() => onCopy('dialogSecret', secret ?? '', 'Secreto copiado')}
          />
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onCopy('pair', pair, 'Credenciales copiadas')}>
            {copiedKey === 'pair' ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            Copiar ambos
          </Button>
          <Button onClick={onClose}>Ya la guardé</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
