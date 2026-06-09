'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { UploadIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadVideo } from '@/hooks/use-admin-videos';

const TYPES = ['video/mp4', 'video/webm'];
const MAX_BYTES = 100 * 1024 * 1024;

export function VideoUpload({
  value,
  onChange,
  onDurationDetected,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  // Reporta la duración real del archivo (segundos) para que el form valide el Select declarado.
  onDurationDetected?: (seconds: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function detectDuration(file: File): void {
    const url = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (Number.isFinite(probe.duration)) onDurationDetected?.(Math.round(probe.duration));
    };
    probe.onerror = () => URL.revokeObjectURL(url);
    probe.src = url;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      toast.error('Formato no soportado (mp4/webm)');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('El video supera los 100 MB');
      return;
    }
    detectDuration(file);
    setBusy(true);
    setProgress(0);
    try {
      const url = await uploadVideo(file, setProgress);
      onChange(url);
      toast.success('Video subido');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {value && !busy && (
        <div className="relative w-fit">
          <video src={value} controls className="max-h-48 rounded-md border" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-1 right-1 size-6"
            aria-label="Quitar video"
            onClick={() => onChange(null)}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      )}
      {busy && (
        <div className="space-y-1">
          <div className="bg-muted h-2 w-full max-w-sm overflow-hidden rounded-full" role="progressbar" aria-valuenow={progress}>
            <div className="bg-primary h-full" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-muted-foreground text-xs">Subiendo… {progress}%</p>
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
        aria-label={value ? 'Cambiar video' : 'Subir video'}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon className="size-4" />
        {busy ? 'Subiendo…' : value ? 'Cambiar video' : 'Subir video'}
      </Button>
    </div>
  );
}
