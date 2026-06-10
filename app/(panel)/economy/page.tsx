import Link from 'next/link';
import {
  BadgeDollarSignIcon,
  BatteryChargingIcon,
  CoinsIcon,
  CreditCardIcon,
  GiftIcon,
  HandshakeIcon,
  ImageIcon,
  RocketIcon,
  ShoppingBagIcon,
  ShuffleIcon,
  SparklesIcon,
  Share2Icon,
  TargetIcon,
  TicketIcon,
  TrendingUpIcon,
  TrophyIcon,
  VideoIcon,
} from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAction } from '@/lib/guard';
import { can, type Action } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const ICON_TONES = [
  'bg-primary/10 text-primary',
  'bg-info/10 text-info',
  'bg-warning/10 text-warning',
  'bg-success/10 text-success',
];

type AreaCard = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  action: Action;
};

const AREAS: AreaCard[] = [
  {
    href: '/economy/coupons',
    label: 'Cupones',
    description: 'Cupones de establecimientos: catálogo, canjes, tracking y acciones de soporte.',
    icon: TicketIcon,
    action: 'economy:coupon:read',
  },
  {
    href: '/economy/sponsors',
    label: 'Sponsors',
    description: 'Mini-CRM: pipeline, contactos, contrato, facturas, documentos y timeline.',
    icon: HandshakeIcon,
    action: 'economy:sponsor:read',
  },
  {
    href: '/economy/referrals',
    label: 'Referidos',
    description: 'Hitos de referido configurables (Nº de invitados → premio) y stats de referidores.',
    icon: Share2Icon,
    action: 'economy:referral:read',
  },
  {
    href: '/economy/banners',
    label: 'Banners',
    description: 'Banners de sponsors por país/placement con stats de impresiones y clics.',
    icon: ImageIcon,
    action: 'economy:banner:read',
  },
  {
    href: '/economy/videos',
    label: 'Videos',
    description: 'Videos patrocinados por país/contexto: catálogo, ventana, peso e impresiones.',
    icon: VideoIcon,
    action: 'economy:video:read',
  },
  {
    href: '/economy/achievements',
    label: 'Logros',
    description: 'Logros: condición, recompensa, activación y re-otorgamiento manual.',
    icon: TrophyIcon,
    action: 'economy:achievement:read',
  },
  {
    href: '/economy/missions',
    label: 'Misiones',
    description: 'Plantillas de misiones diarias, config de refresh e intervención.',
    icon: TargetIcon,
    action: 'economy:mission:read',
  },
  {
    href: '/economy/store',
    label: 'Tienda',
    description: 'Ítems de la tienda de estilo: catálogo, ventana de disponibilidad e inventario.',
    icon: ShoppingBagIcon,
    action: 'economy:store:read',
  },
  {
    href: '/economy/raffles',
    label: 'Premiaciones',
    description: 'Premiaciones mensuales por mérito (Liga Genio): ganadores y entrega.',
    icon: GiftIcon,
    action: 'economy:raffle:read',
  },
  {
    href: '/economy/subscription-prices',
    label: 'Precios de suscripción',
    description: 'Precios por país/plan/período/tamaño (módulo suelto y packs) para app y MRR.',
    icon: BadgeDollarSignIcon,
    action: 'economy:subscription-price:write',
  },
  {
    href: '/economy/promo-offers',
    label: 'Ofertas (Fundador)',
    description: 'Ofertas de lanzamiento por país: cupos, ventana, precio o % e insignia.',
    icon: RocketIcon,
    action: 'economy:subscription-price:write',
  },
  {
    href: '/economy/subscriptions',
    label: 'Suscripciones',
    description: 'Suscripciones de usuarios: comp/grant manual, extender, cancelar, cambiar estado.',
    icon: CreditCardIcon,
    action: 'economy:subscription:read',
  },
  {
    href: '/economy/cross-sell',
    label: 'Cross-sell',
    description: 'Sugerencias entre módulos: origen → destino con mensaje y prioridad.',
    icon: ShuffleIcon,
    action: 'economy:cross-sell:write',
  },
  {
    href: '/economy/monetization',
    label: 'Monetización',
    description: 'Analítica de subs: movimiento, conversión trial→pago y MRR estimado.',
    icon: TrendingUpIcon,
    action: 'economy:monetization:read',
  },
  {
    href: '/economy/energy',
    label: 'Energía y límites free',
    description: 'Config por país: energía (tope/regen/costos) y límites del plan free.',
    icon: BatteryChargingIcon,
    action: 'economy:energy:write',
  },
  {
    href: '/economy/rewards',
    label: 'Recompensas',
    description: 'Cuánto paga cada modo (práctica, duelos, arena, simulacro, racha…) en XP, Kolones y Kokos.',
    icon: SparklesIcon,
    action: 'economy:rewards:write',
  },
  {
    href: '/economy/kokos-packs',
    label: 'Kokos-packs',
    description: 'Packs de Kokos (IAP): cantidad, precio USD, SKU y estado.',
    icon: CoinsIcon,
    action: 'economy:kokos-pack:write',
  },
];

export const metadata = { title: 'Economía' };

export default async function EconomyHome() {
  const user = await requireAction('view:economy');
  const areas = AREAS.filter((area) => can(user.role, area.action));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Economía</h1>
        <p className="text-muted-foreground">
          Gestión de la economía de Kodi: sponsors, cupones, banners, logros, misiones, tienda y
          premiaciones
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area, i) => (
          <Link
            key={area.href}
            href={area.href}
            className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
          >
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader>
                <div
                  className={cn(
                    'mb-3 flex size-10 items-center justify-center rounded-lg',
                    ICON_TONES[i % ICON_TONES.length],
                  )}
                >
                  <area.icon className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-base">{area.label}</CardTitle>
                <CardDescription>{area.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
