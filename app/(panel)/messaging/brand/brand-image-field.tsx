'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { uploadEmailBrandAsset } from '@/hooks/use-email-brand';

// PNG/WebP solamente: son los dos formatos con transparencia que los clientes de
// email renderizan sin sorpresas. El backend revalida (mime, magic bytes, peso y
// dimensiones).
const TYPES = ['image/png', 'image/webp'];

/**
 * Imagen de la identidad (mascota o logo). Controlado: `value` es la URL ya
 * subida o null, y null significa "usar el valor por defecto" — por eso el
 * botón de restaurar aparece solo cuando hay algo cargado.
 */
export function BrandImageField({
  label,
  hint,
  value,
  fallbackUrl,
  fallbackLabel,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  fallbackUrl?: string;
  fallbackLabel: string;
  onChange: (url: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = value ?? fallbackUrl ?? null;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar el mismo archivo
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      toast.error('Formato no soportado (png/webp)');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });
      const url = await uploadEmailBrandAsset({
        filename: file.name,
        contentType: file.type,
        dataBase64: dataUrl.split(',')[1] ?? '',
      });
      if (url) {
        onChange(url);
        toast.success('Imagen subida');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <div className="bg-muted/40 flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border">
          {preview ? (
            <Image
              src={preview}
              alt={label}
              width={80}
              height={80}
              className="size-20 object-contain"
              unoptimized
            />
          ) : (
            <span className="text-muted-foreground px-1 text-center text-[10px]">
              {fallbackLabel}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={TYPES.join(',')}
            onChange={onFile}
            className="hidden"
            tabIndex={-1}
            aria-hidden
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <UploadIcon className="size-4" />
              {busy ? 'Subiendo…' : value ? 'Cambiar' : 'Subir'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                Restaurar por defecto
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </div>
      </div>
    </div>
  );
}
