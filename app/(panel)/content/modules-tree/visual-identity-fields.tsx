'use client';

import { AssetUpload } from '@/components/admin/asset-upload';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

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

export function AssetField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <p className="text-muted-foreground text-xs">{hint}</p>
      <AssetUpload value={value} onChange={onChange} endpoint={CONTENT_ASSET_ENDPOINT} />
    </Field>
  );
}
