'use client';

import { KODI_PALETTE } from '@/lib/kodi-palette';
import { cn } from '@/lib/utils';
import { AssetField, ColorField } from './visual-identity-fields';

/** Lo editable de un sector. Los dos campos viven en la materia o el tema, no en la ruleta. */
export type WheelSectorDraft = {
  colorHex: string | null;
  wheelAssetUrl: string | null;
};

/**
 * Un sector de la ruleta. No es un formulario aparte: escribe los mismos dos campos que el
 * form de la materia o el tema y guarda contra sus endpoints, con la misma validación de color
 * (hex libre) más los atajos de la paleta de marca.
 */
export function WheelSectorEditor({
  name,
  value,
  onChange,
}: {
  name: string;
  value: WheelSectorDraft;
  onChange: (next: WheelSectorDraft) => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-4 shrink-0 rounded-full border"
          style={{ backgroundColor: value.colorHex ?? 'transparent' }}
        />
        <p className="text-sm font-medium">{name}</p>
      </div>

      <ColorField
        label={`Color de ${name}`}
        value={value.colorHex}
        onChange={(colorHex) => onChange({ ...value, colorHex })}
      />
      <PaletteSwatches
        value={value.colorHex}
        onSelect={(colorHex) => onChange({ ...value, colorHex })}
      />

      <AssetField
        label="Arte del sector"
        hint="Gira con la ruleta y se ve chico: tiene que leerse de un vistazo."
        value={value.wheelAssetUrl}
        onChange={(wheelAssetUrl) => onChange({ ...value, wheelAssetUrl })}
      />
    </div>
  );
}

/** Vista sin edición para roles que no escriben contenido. */
export function WheelSectorSummary({ name, value }: { name: string; value: WheelSectorDraft }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <span
        aria-hidden
        className="size-4 shrink-0 rounded-full border"
        style={{ backgroundColor: value.colorHex ?? 'transparent' }}
      />
      <p className="text-sm font-medium">{name}</p>
      <p className="text-muted-foreground ml-auto text-xs">
        {value.colorHex ?? 'sin color propio'}
        {value.wheelAssetUrl ? ' · con arte' : ' · sin arte'}
      </p>
    </div>
  );
}

/**
 * Atajos a la paleta de marca. El hex escrito a mano sigue siendo válido — esto solo evita
 * inventar tonos con la ruedita del selector nativo.
 */
function PaletteSwatches({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (hex: string) => void;
}) {
  const current = value?.trim().toUpperCase();
  return (
    <div className="flex flex-wrap gap-2">
      {KODI_PALETTE.map((color) => {
        const active = current === color.hex;
        return (
          <button
            key={color.hex}
            type="button"
            aria-label={color.name}
            aria-pressed={active}
            onClick={() => onSelect(color.hex)}
            style={{ backgroundColor: color.hex }}
            className={cn(
              'focus-visible:ring-ring/50 size-8 rounded-md border transition-shadow focus-visible:ring-3',
              // El estado no se marca solo con color (el botón ES un color): lo dice el aro.
              active && 'ring-primary ring-offset-card ring-2 ring-offset-2',
            )}
          />
        );
      })}
    </div>
  );
}
