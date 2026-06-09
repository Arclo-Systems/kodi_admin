'use client';

import Image from 'next/image';
import { PLACEMENT_LABELS, type BannerPlacement } from '@/hooks/use-banners';

// Maqueta estática de teléfono que muestra dónde aparece el banner en cada placement.
// En los "home" va arriba del contenido; en "fin de sesión" va abajo del resultado.
export function PlacementPreview({
  placement,
  imageUrl,
}: {
  placement: BannerPlacement;
  imageUrl: string | null;
}) {
  const bannerSlot = imageUrl ? (
    <Image
      src={imageUrl}
      alt="Banner"
      width={248}
      height={64}
      className="h-16 w-full rounded-md border object-cover"
      unoptimized
    />
  ) : (
    <div className="bg-muted text-muted-foreground flex h-16 w-full items-center justify-center rounded-md border text-xs">
      Imagen del banner
    </div>
  );

  const bar = (w: string) => <div className={`bg-muted h-3 rounded ${w}`} />;
  const atBottom = placement === 'session_complete';

  return (
    <div className="bg-background mx-auto w-[280px] rounded-3xl border-4 p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">{PLACEMENT_LABELS[placement]}</span>
        <span className="bg-muted size-6 rounded-full" />
      </div>

      {atBottom ? (
        <div className="space-y-3">
          <div className="space-y-2 py-6 text-center">
            <div className="bg-muted mx-auto size-14 rounded-full" />
            {bar('mx-auto w-2/3')}
            {bar('mx-auto w-1/2')}
          </div>
          {bannerSlot}
        </div>
      ) : (
        <div className="space-y-3">
          {bannerSlot}
          <div className="space-y-2">
            {bar('w-full')}
            {bar('w-5/6')}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-muted h-16 rounded-md" />
              <div className="bg-muted h-16 rounded-md" />
            </div>
            {bar('w-3/4')}
          </div>
        </div>
      )}
    </div>
  );
}
