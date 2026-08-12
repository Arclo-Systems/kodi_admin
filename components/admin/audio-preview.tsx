'use client';

import { HeadphonesIcon } from 'lucide-react';

/** `mm:ss` a partir de segundos; `—` si el backend todavía no sabe la duración. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Preescucha del episodio con el reproductor nativo: nada se publica a ciegas.
 * `preload="metadata"` para no bajar 30 MB al abrir la pestaña.
 */
export function AudioPreview({
  src,
  durationSeconds,
}: {
  src: string;
  durationSeconds: number | null;
}) {
  return (
    <div className="bg-muted/40 space-y-2 rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <HeadphonesIcon className="size-4" aria-hidden />
        <span>Preescucha</span>
        <span className="ml-auto tabular-nums">{formatDuration(durationSeconds)}</span>
      </div>
      <audio className="w-full" controls preload="metadata" src={src}>
        Tu navegador no puede reproducir este audio.
      </audio>
    </div>
  );
}
