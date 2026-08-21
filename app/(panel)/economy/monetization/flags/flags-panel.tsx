'use client';

import { CircleCheckIcon, CircleSlashIcon, TriangleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useKillSwitches, type KillSwitch } from '@/hooks/use-store-monetization';

const DESCRIPTION: Record<string, string> = {
  IAP_PURCHASES_ENABLED:
    'Apaga el botón de comprar en la app. NO corta el cobro: si Play ya cobró, el backend tiene que acreditar igual. Para cortar el cobro de verdad hay que despublicar en Play Console.',
  IAP_RESTORE_ENABLED:
    'Habilita restaurar compras. Necesita además las credenciales de la tienda: sin ellas, el restore se rechaza aunque la variable esté prendida.',
};

function StateBadge({ flag }: { flag: KillSwitch }) {
  if (flag.effective) {
    return (
      <Badge variant="secondary" className="gap-1">
        <CircleCheckIcon className="size-3" /> Activo
      </Badge>
    );
  }
  if (flag.enabled) {
    return (
      <Badge variant="destructive" className="gap-1">
        <TriangleAlertIcon className="size-3" /> Prendido pero sin efecto
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <CircleSlashIcon className="size-3" /> Apagado
    </Badge>
  );
}

export function FlagsPanel() {
  const { data, isLoading, error } = useKillSwitches();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }
  if (isLoading || !data) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Estos interruptores viven en las variables de entorno del backend, así que desde el panel
          son de <strong>solo lectura</strong>. Se cambian en el deploy.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.map((flag) => (
          <Card key={flag.key}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="font-mono text-sm">{flag.key}</CardTitle>
                <StateBadge flag={flag} />
              </div>
              <CardDescription>{DESCRIPTION[flag.key]}</CardDescription>
            </CardHeader>
            {flag.blockedBy.length > 0 && (
              <CardContent>
                <p className="text-destructive text-sm">
                  Falta configurar: <span className="font-mono">{flag.blockedBy.join(', ')}</span>
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
