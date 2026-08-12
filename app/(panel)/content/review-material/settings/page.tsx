import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requireAction } from '@/lib/guard';
import { CharacterVoicesCard } from './character-voices-card';
import { SessionCapCard } from './session-cap-card';

export const metadata = { title: 'Material de repaso · Configuración' };

export default async function ReviewMaterialSettingsPage() {
  // Config y catálogo de voces son admin-only en el backend.
  await requireAction('content:review-material:publish');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Configuración del material de repaso</h1>
          <p className="text-muted-foreground">
            Tope de la sesión diaria de tarjetas y catálogo de personajes de los podcasts
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/content/review-material">
            <ArrowLeftIcon className="size-4" />
            Volver al árbol
          </Link>
        </Button>
      </div>

      <SessionCapCard />
      <CharacterVoicesCard />
    </div>
  );
}
