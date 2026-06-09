'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BanIcon, CircleCheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/lib/status-badge';
import { unwrapData } from '@/lib/bff';

type Session = {
  id: string;
  deviceLabel: string | null;
  ipAddress: string;
  userAgent: string;
  lastSeenAt: string;
  createdAt: string;
  revokedAt: string | null;
};

export function SessionsList({ adminId, self = false }: { adminId: string; self?: boolean }) {
  const qc = useQueryClient();
  // self = sesiones propias del admin logueado (cualquier rol); !self = gestión de otro admin
  // (solo admin global). Cada modo pega a su endpoint pero comparte la misma UI/forma de datos.
  const sessionsUrl = self ? '/api/admin/auth/sessions' : `/api/admin/admins/${adminId}/sessions`;
  const revokeUrl = (sessionId: string) =>
    self
      ? `/api/admin/auth/sessions/${sessionId}/revoke`
      : `/api/admin/admins/sessions/${sessionId}/revoke`;
  const queryKey = ['admin-sessions', self ? 'me' : adminId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<Session[]> => {
      const res = await fetch(sessionsUrl, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch sessions failed');
      return unwrapData<Session[]>(await res.json()) ?? [];
    },
  });

  const [revokeTarget, setRevokeTarget] = useState<Session | null>(null);

  async function revoke(sessionId: string): Promise<void> {
    const res = await fetch(revokeUrl(sessionId), { method: 'POST', credentials: 'include' });
    if (!res.ok) throw new Error('No se pudo revocar la sesión');
    toast.success('Sesión revocada');
    qc.invalidateQueries({ queryKey });
  }

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data?.length) return <p className="text-muted-foreground text-sm">Sin sesiones.</p>;

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dispositivo</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Última actividad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-xs">
                {s.deviceLabel ?? s.userAgent.slice(0, 40)}
              </TableCell>
              <TableCell className="font-mono text-xs">{s.ipAddress}</TableCell>
              <TableCell>{new Date(s.lastSeenAt).toLocaleString('es')}</TableCell>
              <TableCell>
                {s.revokedAt ? (
                  <StatusBadge tone="destructive" icon={BanIcon} label="Revocada" />
                ) : (
                  <StatusBadge tone="success" icon={CircleCheckIcon} label="Activa" />
                )}
              </TableCell>
              <TableCell className="text-right">
                {!s.revokedAt && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRevokeTarget(s)}
                  >
                    <BanIcon className="size-4" /> Revocar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="Revocar sesión"
        description={
          revokeTarget
            ? `Se cerrará la sesión de «${revokeTarget.deviceLabel ?? revokeTarget.userAgent.slice(0, 40)}».`
            : ''
        }
        destructive
        confirmLabel="Revocar"
        onConfirm={async () => {
          if (revokeTarget) await revoke(revokeTarget.id);
        }}
      />
    </div>
  );
}
