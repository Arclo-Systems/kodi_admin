'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import {
  useSponsorDocuments,
  useSponsorDocumentMutations,
  type SponsorDocument,
} from '@/hooks/use-sponsors';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { openSignedAsset } from '@/lib/signed-asset';

const DOC_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function fmtSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function SponsorDocumentsTab({ sponsorId }: { sponsorId: string }) {
  const { data: docs, isLoading } = useSponsorDocuments(sponsorId);
  const { upload, remove } = useSponsorDocumentMutations(sponsorId);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<SponsorDocument | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!DOC_TYPES.includes(file.type)) {
      toast.error('Formato no soportado (pdf, imagen, word, excel)');
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
      await upload.mutateAsync({
        filename: file.name,
        contentType: file.type,
        dataBase64: dataUrl.split(',')[1] ?? '',
      });
      toast.success('Documento subido');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={DOC_TYPES.join(',')}
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
        aria-label="Subir documento"
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon className="size-4" />
        {busy ? 'Subiendo…' : 'Subir documento'}
      </Button>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (docs?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground text-sm">Sin documentos.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {docs!.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-3">
              <FileIcon className="text-muted-foreground size-4 shrink-0" />
              <button
                type="button"
                onClick={() =>
                  openSignedAsset(`/api/admin/economy/sponsors/${sponsorId}/documents/${d.id}/url`).catch(
                    (err) => toast.error(err instanceof Error ? err.message : 'No se pudo abrir'),
                  )
                }
                className="flex-1 truncate text-left text-sm font-medium hover:underline"
              >
                {d.name}
              </button>
              <span className="text-muted-foreground text-xs">{fmtSize(d.sizeBytes)}</span>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive size-7"
                aria-label="Eliminar documento"
                onClick={() => setToDelete(d)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar documento"
        description="Se borra el documento permanentemente."
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!toDelete) return;
          await remove.mutateAsync(toDelete.id);
          toast.success('Documento eliminado');
        }}
      />
    </div>
  );
}
