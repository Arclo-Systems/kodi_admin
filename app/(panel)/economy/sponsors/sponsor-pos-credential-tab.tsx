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
  const [copied, setCopied] = useState(false);

  const rotatedAt = sponsor?.merchantSecretRotatedAt ?? null;

  async function issueCredential(twoFaToken: string): Promise<void> {
    const wasEnabled = rotatedAt !== null;
    const credential = await rotate.mutateAsync(twoFaToken);
    setSecret(credential.secret);
    toast.success(wasEnabled ? 'Credencial rotada' : 'Credencial generada');
  }

  async function copySecret(): Promise<void> {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Credencial copiada');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRoundIcon className="text-primary size-4" />
          Credencial del POS
        </CardTitle>
        <CardDescription>
          La caja del comercio la envía junto con su ID para consultar y cobrar cupones. Solo sirve
          para los cupones de este sponsor.
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
        ) : rotatedAt ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone="success" icon={CircleCheckIcon} label="POS habilitado" />
              <span className="text-muted-foreground text-sm">
                Generada o rotada el {fmtDateTime(rotatedAt)}
              </span>
            </div>
            {canWrite && (
              <Button variant="outline" size="sm" onClick={() => setRotateOpen(true)}>
                <RefreshCwIcon className="size-4" />
                Rotar credencial
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone="muted" icon={CircleOffIcon} label="Sin credencial" />
              <span className="text-muted-foreground text-sm">
                Este comercio todavía no puede cobrar cupones en caja.
              </span>
            </div>
            {canWrite && (
              <Button size="sm" onClick={() => setGenerateOpen(true)}>
                <KeyRoundIcon className="size-4" />
                Generar credencial
              </Button>
            )}
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
        onConfirm={async ({ twoFaToken }) => {
          await issueCredential(twoFaToken ?? '');
        }}
      />

      <SecretDialog
        secret={secret}
        copied={copied}
        onCopy={copySecret}
        onClose={() => setSecret(null)}
      />
    </Card>
  );
}

// El secreto en claro solo existe en esta respuesta: si se cierra sin copiarlo,
// la única salida es rotar de nuevo.
function SecretDialog({
  secret,
  copied,
  onCopy,
  onClose,
}: {
  secret: string | null;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!secret} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credencial del POS</DialogTitle>
          <DialogDescription>
            Copiala y pasala al comercio por un canal seguro. <strong>No la vas a volver a ver</strong> —
            si se pierde, hay que rotar.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted flex items-center gap-2 rounded-md border p-3">
          <code className="flex-1 font-mono text-sm break-all">{secret}</code>
          <Button size="icon" variant="ghost" onClick={onCopy} aria-label="Copiar credencial">
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
