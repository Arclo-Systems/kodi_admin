'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import {
  AlertTriangleIcon,
  BookmarkIcon,
  InboxIcon,
  ListChecksIcon,
  ReceiptTextIcon,
  RocketIcon,
  ToggleLeftIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDlq, useIncidents } from '@/hooks/use-store-monetization';

type Entry = {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

// La fila de arriba es la que tiene trabajo pendiente y por eso lleva el contador; las de
// abajo son consulta. Siete cards idénticas serían un menú disfrazado de tablero: en un panel
// de soporte, lo que decide a dónde entrar es cuántas incidencias hay abiertas.
const PENDING: Entry[] = [
  {
    href: '/economy/monetization/incidencias',
    label: 'Incidencias',
    description: 'Compras que el pipeline no cerró solo y saldos de Kokos en negativo.',
    icon: AlertTriangleIcon,
  },
  {
    href: '/economy/monetization/dlq',
    label: 'Cola de descartes',
    description: 'Notificaciones que murieron antes del pipeline, con reintento manual.',
    icon: InboxIcon,
  },
];

const OPERATION: Entry[] = [
  {
    href: '/economy/monetization/compras',
    label: 'Compras recientes',
    description: 'Notificaciones de Play con estado, latencia y reproceso.',
    icon: ReceiptTextIcon,
  },
  {
    href: '/economy/monetization/fundador',
    label: 'Oferta fundador',
    description: 'Cupos entregados, apartados y disponibles, con el movimiento por día.',
    icon: RocketIcon,
  },
  {
    href: '/economy/monetization/reservas',
    label: 'Reservas',
    description: 'Lugares apartados durante el trial: estado, vencimiento e intent.',
    icon: BookmarkIcon,
  },
];

const REFERENCE: Entry[] = [
  {
    href: '/economy/monetization/skus',
    label: 'Catálogo de SKUs',
    description: 'La allowlist que traduce lo que cobra Play a un plan de Kodi.',
    icon: ListChecksIcon,
  },
  {
    href: '/economy/monetization/flags',
    label: 'Interruptores',
    description: 'Valor efectivo de los kill-switches de compras y restore.',
    icon: ToggleLeftIcon,
  },
];

function NavCard({ entry, count }: { entry: Entry; count?: number }) {
  return (
    <Link
      href={entry.href}
      className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
    >
      <Card className="hover:border-primary/40 h-full transition-colors">
        <CardHeader>
          <div className="mb-3 flex items-center justify-between">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <entry.icon className="size-4" aria-hidden />
            </div>
            {count !== undefined && (
              <Badge variant={count > 0 ? 'destructive' : 'secondary'} className="tabular-nums">
                {count}
              </Badge>
            )}
          </div>
          <CardTitle className="text-sm">{entry.label}</CardTitle>
          <CardDescription className="text-xs">{entry.description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

/**
 * Navegación del área de tienda. Solo la ve un admin global: cinco de las siete vistas
 * las corta `assertGlobalScope` en el backend, así que enlazarlas para un regional sería
 * mandarlo a un 403.
 */
export function StoreOpsNav() {
  const incidents = useIncidents({ page: 1 });
  const dlq = useDlq(1);

  const abiertas = incidents.data?.total;
  const descartes = dlq.data?.total;
  const cargando = incidents.isLoading || dlq.isLoading;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Operación de tienda</h2>

      {cargando ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NavCard entry={PENDING[0]!} count={abiertas} />
          <NavCard entry={PENDING[1]!} count={descartes} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPERATION.map((entry) => (
          <NavCard key={entry.href} entry={entry} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-2/3">
        {REFERENCE.map((entry) => (
          <NavCard key={entry.href} entry={entry} />
        ))}
      </div>
    </section>
  );
}

/** Las dos vistas con país, para el admin regional (las otras cinco le darían 403). */
export function StoreOpsNavRegional() {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Cupos de fundador</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-2/3">
        {OPERATION.filter((entry) => entry.href.match(/fundador|reservas/)).map((entry) => (
          <NavCard key={entry.href} entry={entry} />
        ))}
      </div>
    </section>
  );
}
