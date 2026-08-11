'use client';

import { AssetUpload } from '@/components/admin/asset-upload';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { KODI_PALETTE } from '@/lib/kodi-palette';
import { cn } from '@/lib/utils';

// Endpoint único para el arte de los tres niveles del árbol: el asset se sube
// suelto y se asocia al guardar el nodo.
export const CONTENT_ASSET_ENDPOINT = '/api/admin/content/modules/upload-asset';

const FALLBACK = '#408D99';

/**
 * Color de identidad. Se muestra el selector nativo junto al hex escrito: el
 * hex importa porque tiene que coincidir con la paleta de marca, y elegirlo solo
 * con la ruedita lleva a tonos inventados.
 */
export function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`Selector de ${label.toLowerCase()}`}
          value={value || FALLBACK}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border bg-transparent"
        />
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
          maxLength={7}
          className="max-w-[140px]"
        />
      </div>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </Field>
  );
}

/**
 * Atajos a la paleta de marca. El hex escrito a mano sigue siendo válido — esto solo evita
 * inventar tonos con la ruedita del selector nativo.
 */
export function PaletteSwatches({
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

/** `endpoint` para el arte que no cuelga del árbol de contenido (la corona tiene el suyo). */
export function AssetField({
  label,
  hint,
  value,
  onChange,
  endpoint = CONTENT_ASSET_ENDPOINT,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (v: string | null) => void;
  endpoint?: string;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <p className="text-muted-foreground text-xs">{hint}</p>
      <AssetUpload value={value} onChange={onChange} endpoint={endpoint} />
    </Field>
  );
}
