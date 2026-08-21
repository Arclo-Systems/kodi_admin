import Link from 'next/link';
import {
  AlertTriangleIcon,
  InboxIcon,
  ListChecksIcon,
  ReceiptTextIcon,
  RocketIcon,
  ToggleLeftIcon,
  BookmarkIcon,
} from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAction } from '@/lib/guard';
import { COUNTRIES } from '@/lib/countries';
import { MonetizationAnalytics } from './monetization-analytics';

export const metadata = { title: 'Monetización' };

// Las siete vistas de la tienda (mini-ola IAP). Van acá y no en el home de Economía:
// son un área operativa propia —soporte de compras— y no una sección más del catálogo.
const VIEWS = [
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
  {
    href: '/economy/monetization/compras',
    label: 'Compras recientes',
    description: 'Notificaciones de Play con estado, latencia y reproceso.',
    icon: ReceiptTextIcon,
  },
  {
    href: '/economy/monetization/incidencias',
    label: 'Incidencias',
    description: 'Compras que el pipeline no cerró solo y saldos de Kokos en negativo.',
    icon: AlertTriangleIcon,
  },
  {
    href: '/economy/monetization/dlq',
    label: 'Cola de descartes',
    description: 'Mensajes que murieron antes del pipeline, con reintento manual.',
    icon: InboxIcon,
  },
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

export default async function MonetizationPage() {
  const user = await requireAction('economy:monetization:read');
  const allowedCountries = user.isGlobalScope
    ? COUNTRIES.map((c) => c.code)
    : user.assignedCountries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Monetización</h1>
        <p className="text-muted-foreground">
          Analítica de suscripciones: movimiento, conversión trial→pago y <strong>MRR estimado</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {VIEWS.map((view) => (
          <Link
            key={view.href}
            href={view.href}
            className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
          >
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader>
                <div className="bg-primary/10 text-primary mb-3 flex size-9 items-center justify-center rounded-lg">
                  <view.icon className="size-4" aria-hidden />
                </div>
                <CardTitle className="text-sm">{view.label}</CardTitle>
                <CardDescription className="text-xs">{view.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <MonetizationAnalytics allowedCountries={allowedCountries} />
    </div>
  );
}
