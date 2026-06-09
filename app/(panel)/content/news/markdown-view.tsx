'use client';

import ReactMarkdown from 'react-markdown';

const MD_STYLES =
  'rounded-md text-sm [&_a]:text-primary [&_a]:underline [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-semibold [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5';

// Render seguro de Markdown (sin rehype-raw → no HTML crudo). Reusado por el editor y el preview.
export function MarkdownView({ value, className }: { value: string; className?: string }) {
  return (
    <div className={`${MD_STYLES} ${className ?? ''}`}>
      <ReactMarkdown>{value}</ReactMarkdown>
    </div>
  );
}
