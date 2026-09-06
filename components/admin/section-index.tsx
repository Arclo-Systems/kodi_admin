import type { ComponentType } from 'react';
import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Action } from '@/lib/permissions';
import { cn } from '@/lib/utils';

// Cuatro tonos rotando: el color agrupa visualmente sin significar nada: es la
// misma información en las diez cards, y darle sentido al color obligaría a
// recordarlo.
const ICON_TONES = [
  'bg-primary/10 text-primary',
  'bg-info/10 text-info',
  'bg-warning/10 text-warning',
  'bg-success/10 text-success',
];

export type SectionCard = {
  href: string;
  label: string;
  /** Una línea: qué se hace ahí, no cómo. */
  description: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** Permiso que habilita la card. El filtrado lo hace la página, con `can`. */
  action: Action;
};

/**
 * Índice de una sección del panel: la grilla de cards que sustituye a un menú.
 *
 * Vive acá y no en cada página porque las secciones grandes (Contenido,
 * Finanzas) tienen que entrar igual: dos grillas parecidas pero distintas se
 * leen como dos productos.
 */
export function SectionIndex({ cards }: { cards: SectionCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, i) => (
        <Link
          key={card.href}
          href={card.href}
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
                <card.icon className="size-5" aria-hidden />
              </div>
              <CardTitle className="text-base">{card.label}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
