'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LegalEditor } from './legal-editor';

/**
 * Los dos documentos en la misma pantalla: son dos textos del mismo trámite y se
 * revisan juntos. Tabs (no dos páginas) evita duplicar la explicación y el aviso
 * de publicación en cada una.
 */
export function LegalTabs() {
  return (
    <Tabs defaultValue="terms">
      <TabsList>
        <TabsTrigger value="terms">Términos de uso</TabsTrigger>
        <TabsTrigger value="privacy">Política de privacidad</TabsTrigger>
      </TabsList>
      <TabsContent value="terms" className="pt-4">
        <LegalEditor doc="terms" />
      </TabsContent>
      <TabsContent value="privacy" className="pt-4">
        <LegalEditor doc="privacy" />
      </TabsContent>
    </Tabs>
  );
}
