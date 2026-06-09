'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { UploadIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unwrapData } from '@/lib/bff';

const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

// Subida de imágenes a R2 reusable (Ola 10a). El `endpoint` apunta a la ruta BFF del recurso
// (banner/logro/avatar-bot). Generalización de StoreAssetUpload.
export function AssetUpload({
  value,
  onChange,
  endpoint,
  label = 'Subir imagen',
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  endpoint: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar el mismo archivo
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      toast.error('Formato no soportado (png/jpeg/webp/avif)');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('No se pudo leer el archivo'));
        r.readAsDataURL(file);
      });
      const dataBase64 = dataUrl.split(',')[1] ?? '';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, dataBase64 }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(b.message ?? 'Error subiendo la imagen');
      }
      const data = unwrapData<{ url: string }>(await res.json());
      if (data?.url) {
        onChange(data.url);
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
      {value && (
        <div className="relative w-fit">
          <Image
            src={value}
            alt=""
            width={120}
            height={120}
            className="rounded-md border object-cover"
            unoptimized
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-1 right-1 size-6"
            aria-label="Quitar imagen"
            onClick={() => onChange(null)}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={TYPES.join(',')}
        onChange={onFile}
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon className="size-4" />
        {busy ? 'Subiendo…' : value ? 'Cambiar imagen' : label}
      </Button>
    </div>
  );
}
