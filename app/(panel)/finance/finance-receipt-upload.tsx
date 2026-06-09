'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { PaperclipIcon, UploadIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadReceipt } from '@/hooks/use-finance';

const TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

// value: null (sin comprobante) · cadena (key R2). El padre distingue "mantener el actual" con su propio
// sentinel; acá solo: hay algo (truthy) o no.
export function FinanceReceiptUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (key: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      toast.error('Formato no soportado (pdf, png, jpeg, webp)');
      return;
    }
    setBusy(true);
    try {
      const key = await uploadReceipt(file);
      onChange(key);
      toast.success('Comprobante subido');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value && (
        <span className="text-success inline-flex items-center gap-1 text-sm">
          <PaperclipIcon className="size-3.5" />
          Adjunto
        </span>
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
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon className="size-4" />
        {busy ? 'Subiendo…' : value ? 'Cambiar' : 'Subir comprobante'}
      </Button>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => onChange(null)}
        >
          <XIcon className="size-4" />
          Quitar
        </Button>
      )}
    </div>
  );
}
