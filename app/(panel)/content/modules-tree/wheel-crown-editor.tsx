'use client';

import { CrownIcon, SaveIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WHEEL_CROWN_ASSET_ENDPOINT } from '@/hooks/use-wheel-config';
import { AssetField, ColorField, PaletteSwatches } from './visual-identity-fields';

/** Lo editable de la corona, tal como lo dibuja la réplica. */
export type WheelCrownDraft = {
  assetUrl: string | null;
  colorHex: string | null;
};

/**
 * El sector de la corona. A diferencia de los otros, no es de este módulo: la corona es una
 * config global del juego, con su propio endpoint y su propio guardado — por eso el botón vive
 * en el bloque y no en el pie de la pestaña.
 */
export function WheelCrownEditor({
  value,
  loading,
  dirty,
  saving,
  onChange,
  onDiscard,
  onSave,
}: {
  value: WheelCrownDraft;
  loading: boolean;
  dirty: boolean;
  saving: boolean;
  onChange: (next: WheelCrownDraft) => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div data-slot="wheel-crown" className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <CrownIcon className="size-4 shrink-0" />
        <p className="text-sm font-medium">Corona</p>
      </div>

      <Alert>
        <AlertTitle>Aplica a todos los módulos</AlertTitle>
        <AlertDescription>
          La corona es una sola para toda la Partida Kodi: lo que se guarde acá cambia la ruleta
          de todos los módulos, en todos los países. Sin arte ni color propios, la app dibuja su
          corona de siempre.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-32" />
        </div>
      ) : (
        <>
          <ColorField
            label="Color de la corona"
            value={value.colorHex}
            onChange={(colorHex) => onChange({ ...value, colorHex })}
          />
          <PaletteSwatches
            value={value.colorHex}
            onSelect={(colorHex) => onChange({ ...value, colorHex })}
          />

          <AssetField
            label="Arte de la corona"
            hint="Gira con la ruleta y se ve chico: tiene que leerse de un vistazo."
            value={value.assetUrl}
            onChange={(assetUrl) => onChange({ ...value, assetUrl })}
            endpoint={WHEEL_CROWN_ASSET_ENDPOINT}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!dirty || saving}
              onClick={onDiscard}
            >
              Descartar corona
            </Button>
            <Button type="button" size="sm" disabled={!dirty || saving} onClick={onSave}>
              <SaveIcon className="size-4" />
              {saving ? 'Guardando…' : 'Guardar corona'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
