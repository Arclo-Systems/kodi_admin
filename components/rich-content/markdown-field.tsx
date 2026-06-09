'use client';

import { useRef, useState } from 'react';
import { ImageIcon, SigmaIcon, TableIcon, WorkflowIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { unwrapData } from '@/lib/bff';

export type RichTool = 'formula' | 'table' | 'image' | 'mermaid';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
const TABLE_SNIPPET = '\n| Columna | Columna |\n| --- | --- |\n| celda | celda |\n';
const MERMAID_SNIPPET = '\n```mermaid\ngraph TD\n  A[Inicio] --> B[Fin]\n```\n';

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('No se pudo leer el archivo'));
    r.readAsDataURL(file);
  });
  return dataUrl.split(',')[1] ?? '';
}

// Editor Markdown enriquecido (LaTeX/tablas/diagramas/imágenes) con toolbar de inserción al cursor.
// El preview vive aparte (RichContent) — este componente solo edita la fuente Markdown.
export function MarkdownField({
  id,
  value,
  onChange,
  tools,
  rows = 3,
  maxLength,
  placeholder,
  ariaLabel,
  ariaInvalid,
  uploadUrl,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  tools: RichTool[];
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  uploadUrl?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function applyAt(start: number, end: number, replacement: string, caret: number): void {
    onChange(value.slice(0, start) + replacement + value.slice(end));
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  function bounds(): { start: number; end: number } {
    const el = ref.current;
    if (!el) return { start: value.length, end: value.length };
    return { start: el.selectionStart, end: el.selectionEnd };
  }

  function wrap(token: string): void {
    const { start, end } = bounds();
    const inner = value.slice(start, end);
    applyAt(start, end, `${token}${inner}${token}`, start + token.length + inner.length);
  }

  function insertBlock(snippet: string): void {
    const { start, end } = bounds();
    applyAt(start, end, snippet, start + snippet.length);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadUrl) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error('Formato no soportado (png/jpeg/webp/avif)');
      return;
    }
    setUploading(true);
    try {
      const dataBase64 = await fileToBase64(file);
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, dataBase64 }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(b.message ?? 'Error subiendo imagen');
      }
      const data = unwrapData<{ url: string }>(await res.json());
      if (data?.url) {
        const snippet = `![](${data.url})`;
        const { start, end } = bounds();
        applyAt(start, end, snippet, start + snippet.length);
        toast.success('Imagen insertada');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {tools.includes('formula') && (
          <Button type="button" variant="ghost" size="sm" onClick={() => wrap('$')}>
            <SigmaIcon className="size-4" />
            Fórmula
          </Button>
        )}
        {tools.includes('table') && (
          <Button type="button" variant="ghost" size="sm" onClick={() => insertBlock(TABLE_SNIPPET)}>
            <TableIcon className="size-4" />
            Tabla
          </Button>
        )}
        {tools.includes('mermaid') && (
          <Button type="button" variant="ghost" size="sm" onClick={() => insertBlock(MERMAID_SNIPPET)}>
            <WorkflowIcon className="size-4" />
            Diagrama
          </Button>
        )}
        {tools.includes('image') && uploadUrl && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_TYPES.join(',')}
              onChange={onPickImage}
              className="hidden"
              tabIndex={-1}
              aria-hidden
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon className="size-4" />
              {uploading ? 'Subiendo…' : 'Imagen'}
            </Button>
          </>
        )}
      </div>
      <Textarea
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className="font-mono text-sm"
      />
    </div>
  );
}
