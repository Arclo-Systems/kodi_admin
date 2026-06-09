'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Etiquetas legibles por segmento de ruta. Lo no listado cae a Title Case;
// los segmentos que parecen id se muestran como "Detalle".
const LABELS: Record<string, string> = {
  users: 'Usuarios',
  content: 'Contenido',
  economy: 'Economía',
  admins: 'Admins',
  'audit-log': 'Audit log',
  health: 'Health',
  jobs: 'Jobs',
  moderation: 'Moderación',
  tickets: 'Tickets',
  features: 'Features',
  messaging: 'Mensajería',
  launches: 'Lanzamientos',
  game: 'Juego',
  bots: 'Bots',
  leagues: 'Ligas',
  me: 'Mi cuenta',
  sessions: 'Sesiones',
  // sub-secciones comunes
  new: 'Nuevo',
  edit: 'Editar',
  config: 'Configuración',
  intervention: 'Intervención',
  inventory: 'Inventario',
  'bulk-import': 'Importar',
  'modules-tree': 'Módulos',
  'prohibited-words': 'Palabras prohibidas',
  segments: 'Segmentos',
  templates: 'Plantillas',
  schedule: 'Programar',
  coupons: 'Cupones',
  achievements: 'Logros',
  missions: 'Misiones',
  store: 'Tienda',
  banners: 'Banners',
  raffles: 'Rifas',
  sponsors: 'Patrocinadores',
  branches: 'Sucursales',
  'sponsor-invoices': 'Facturas',
  subscriptions: 'Suscripciones',
  'cross-sell': 'Cross-sell',
  monetization: 'Monetización',
  energy: 'Energía',
  'kokos-packs': 'Paquetes Kokos',
  'subscription-prices': 'Precios',
  referrals: 'Referidos',
  'promo-offers': 'Ofertas',
  questions: 'Preguntas',
  news: 'Noticias',
  'admission-cutoffs': 'Notas de corte',
  'ai-prompts': 'Prompts IA',
  careers: 'Carreras',
  uploads: 'Subidas',
  'vocational-items': 'Ítems vocacionales',
  'riasec-types': 'Tipos RIASEC',
  matches: 'Partidas',
  arenas: 'Arenas',
  simulacros: 'Simulacros',
  'quick-modes': 'Modos rápidos',
  activity: 'Actividad',
  social: 'Social',
  ai: 'IA',
  events: 'Eventos',
};

// Segmentos que son solo contenedores de ruta (sin página índice propia): se muestran como
// texto, no como link, para no mandar a un 404. Ej: /economy/sponsor-invoices solo existe en
// /new y /[id], no como listado.
const NON_NAVIGABLE = new Set(['sponsor-invoices', 'branches']);

const looksLikeId = (s: string) =>
  /^\d+$/.test(s) || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s) || s.length > 20;

const labelFor = (segment: string) => {
  if (looksLikeId(segment)) return 'Detalle';
  return LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
};

export function AppBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((segment, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    return {
      label: labelFor(segment),
      href: path,
      isLast: i === segments.length - 1,
      nonNavigable: NON_NAVIGABLE.has(segment),
    };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {crumbs.length === 0 ? (
            <BreadcrumbPage>Inicio</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/">Inicio</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : crumb.nonNavigable ? (
                <span className="text-muted-foreground">{crumb.label}</span>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
