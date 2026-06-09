'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownView } from './markdown-view';

export function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Tabs defaultValue="edit">
      <TabsList>
        <TabsTrigger value="edit">Editar</TabsTrigger>
        <TabsTrigger value="preview">Vista previa</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={14}
          className="font-mono text-sm"
          aria-label="Cuerpo en Markdown"
        />
      </TabsContent>
      <TabsContent value="preview">
        {value ? (
          <MarkdownView value={value} className="min-h-48 border p-4" />
        ) : (
          <div className="min-h-48 rounded-md border p-4 text-sm">
            <p className="text-muted-foreground">Nada para previsualizar todavía…</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
