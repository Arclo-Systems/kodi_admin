'use client';

import Link from 'next/link';
import { BellRingIcon } from 'lucide-react';
import { useUnseenFinanceAlerts } from '@/hooks/use-finance-planning';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * Las alertas que nadie miró todavía, en el índice de Finanzas.
 *
 * Este banner ES el canal: no hay correo a admins, así que una alerta que solo
 * vive dentro de `/finance/alertas` es una alerta que nadie va a ver hasta que
 * entre a buscarla. Mismo criterio que el semáforo de Play — un conteo que no
 * llegó no se pinta como cero: con el endpoint caído el banner desaparece en vez
 * de afirmar que no hay nada pendiente.
 */
export function FinanceAlertsBanner() {
  const { count, isLoading, isError } = useUnseenFinanceAlerts();
  if (isLoading || isError || !count) return null;

  return (
    <Alert>
      <BellRingIcon />
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>
          {count === 1
            ? 'Hay 1 alerta financiera sin ver.'
            : `Hay ${count} alertas financieras sin ver.`}
        </span>
        <Button asChild variant="outline" size="sm">
          <Link href="/finance/alertas">Ver alertas</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
