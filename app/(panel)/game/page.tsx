import Link from 'next/link';
import { ClipboardCheckIcon, ShieldIcon, SwordsIcon, TimerIcon } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAction } from '@/lib/guard';
import { cn } from '@/lib/utils';

const ICON_TONES = [
  'bg-primary/10 text-primary',
  'bg-info/10 text-info',
  'bg-warning/10 text-warning',
  'bg-success/10 text-success',
];

const AREAS = [
  {
    href: '/game/matches',
    label: 'Partidas',
    description: 'Partida Kodi 1v1 (aleatoria y privada): inspección y anulación.',
    icon: SwordsIcon,
  },
  {
    href: '/game/arenas',
    label: 'Arena',
    description: 'Arena de supervivencia (rápida, especial y privada): inspección, anulación y programación.',
    icon: ShieldIcon,
  },
  {
    href: '/game/simulacros',
    label: 'Simulacros',
    description: 'Simulacros de examen: inspección y anulación.',
    icon: ClipboardCheckIcon,
  },
  {
    href: '/game/quick-modes',
    label: 'Modos rápidos',
    description: 'Contrarreloj y Supervivencia: inspección y anulación (reversa de Kolones).',
    icon: TimerIcon,
  },
];

export const metadata = { title: 'Juego' };

export default async function GamePage() {
  await requireAction('view:game');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Juego</h1>
        <p className="text-muted-foreground">Inspección y anulación de los modos de juego.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map((area, i) => (
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
