'use client';

import { useQueries } from '@tanstack/react-query';
import { AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { unwrapData } from '@/lib/bff';
import type { components } from '@/types/api';

// El backend chequea una integración por request (`?service=`), así que el
// panel pregunta por las tres en paralelo en vez de inventar un endpoint nuevo.
const INTEGRATIONS = [
  { service: 'brevo', label: 'Brevo (email)' },
  { service: 'fcm', label: 'FCM (push)' },
  { service: 'posthog', label: 'PostHog (analítica)' },
] as const;

type IntegrationCheck = components['schemas']['IntegrationCheckResponse']['data'];

async function checkIntegration(service: string): Promise<IntegrationCheck> {
  const res = await fetch(
    `/api/admin/health/integrations/check?service=${encodeURIComponent(service)}`,
    { credentials: 'include' },
  );
  if (!res.ok) throw new Error('check failed');
  const data = unwrapData<IntegrationCheck>(await res.json());
  if (!data) throw new Error('check failed');
  return data;
}

export function HealthIntegrations() {
  const results = useQueries({
    queries: INTEGRATIONS.map(({ service }) => ({
      queryKey: ['health', 'integrations', service],
      queryFn: () => checkIntegration(service),
      // Cada check pega contra el proveedor: mucho menos agresivo que el resumen.
      refetchInterval: 120_000,
      retry: false,
    })),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integraciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {INTEGRATIONS.map(({ service, label }, i) => {
          const query = results[i];
          // Un check que no se pudo pedir NO es una integración sana: se
          // muestra caída con el motivo, no en verde por omisión.
          const check = query?.data;
          const ok = check?.ok === true;
          const message = query?.isError
            ? 'No se pudo consultar el estado.'
            : (check?.message ?? '');

          return (
            <div
              key={service}
              className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                {query?.isPending ? (
                  <Skeleton className="mt-1 h-4 w-48" />
                ) : (
                  <p className="text-muted-foreground text-sm break-words">
                    {message || 'Sin detalle.'}
                  </p>
                )}
              </div>
              {query?.isPending ? (
                <Skeleton className="h-5 w-16 shrink-0" />
              ) : (
                <Badge
                  variant={ok ? 'default' : 'destructive'}
                  className={ok ? 'bg-success/10 text-success' : undefined}
                >
                  {ok ? (
                    <CheckCircleIcon aria-hidden />
                  ) : (
                    <AlertTriangleIcon aria-hidden />
                  )}
                  {ok ? 'OK' : 'Caída'}
                </Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
