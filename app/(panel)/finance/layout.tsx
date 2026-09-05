'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3Icon,
  BookOpenIcon,
  LandmarkIcon,
  LayersIcon,
  ReceiptIcon,
  ScaleIcon,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABS = [
  { href: '/finance', label: 'Dashboard', icon: BarChart3Icon },
  { href: '/finance/movimientos', label: 'Movimientos', icon: ReceiptIcon },
  { href: '/finance/mayor', label: 'Mayor', icon: BookOpenIcon },
  { href: '/finance/comprobacion', label: 'Comprobación', icon: ScaleIcon },
  { href: '/finance/cuentas', label: 'Cuentas', icon: LandmarkIcon },
  { href: '/finance/categorias', label: 'Categorías', icon: LayersIcon },
];

export default function FinanceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // El header + tabs de sección solo en las rutas-tab exactas. Las sub-páginas (movimientos/new,
  // movimientos/:id/edit) son páginas dedicadas: renderizan limpias, con su propio título.
  const active = TABS.find((t) => t.href === pathname)?.href;
  if (!active) return <>{children}</>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Finanzas</h1>
        <p className="text-muted-foreground">
          Contabilidad de la empresa por partida doble: los reportes salen del libro mayor, no de un
          agregado aparte. Los ingresos incluyen las facturas de sponsor pagadas.
        </p>
      </div>
      <Tabs value={active}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.href} value={t.href} asChild>
              <Link href={t.href}>
                <t.icon />
                {t.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
