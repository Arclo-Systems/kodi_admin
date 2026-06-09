'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import { Mermaid } from './mermaid';

// Schema de saneo: default + wrappers de remark-math (span/div con clase math*) + code language-*.
// El orden es [sanitize, katex] (AUD-SEC-1): se sanea el HTML del autor ANTES de KaTeX; la salida
// de KaTeX es confiable (trust:false) y no se re-sanitiza.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), ['className', 'math', 'math-inline']],
    div: [...(defaultSchema.attributes?.div ?? []), ['className', 'math', 'math-display']],
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-./]],
  },
} as typeof defaultSchema;

const STYLES = cn(
  'text-sm',
  '[&_a]:text-primary [&_a]:underline',
  '[&_code]:bg-muted [&_code]:rounded [&_code]:px-1',
  '[&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold',
  '[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold',
  '[&_h3]:mt-2 [&_h3]:font-semibold',
  '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
  // tablas GFM
  '[&_table]:my-2 [&_table]:w-auto [&_table]:border-collapse [&_table]:text-sm',
  '[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:font-medium',
  '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1',
  // matemática en bloque centrada (sin overflow → sin scrollbars internos, DESIGN L9)
  '[&_.katex-display]:my-3',
  '[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md',
);

// Render de contenido rico: Markdown + LaTeX (KaTeX) + Mermaid + tablas + imágenes, saneado.
// `allowMermaid=false` (ej. opciones) → los bloques mermaid se muestran como código, no como diagrama.
// Reusable: preview del panel hoy; base del DOM component de la app después.
export function RichContent({
  value,
  className,
  allowMermaid = true,
}: {
  value: string;
  className?: string;
  allowMermaid?: boolean;
}) {
  return (
    <div className={cn(STYLES, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeSanitize, schema], rehypeKatex]}
        components={{
          code({ className: cls, children }) {
            if (allowMermaid && /\blanguage-mermaid\b/.test(cls ?? '')) {
              return <Mermaid chart={String(children).trim()} />;
            }
            return <code className={cls}>{children}</code>;
          },
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
