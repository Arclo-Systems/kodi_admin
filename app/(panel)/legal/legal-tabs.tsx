'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DOC_ICONS, DOC_LABELS, LEGAL_DOCS } from '@/hooks/use-legal';
import { LegalEditor } from './legal-editor';

/**
 * Los documentos legales en la misma pantalla: son textos del mismo trámite y se
 * revisan juntos. Tabs (no una página por documento) evita duplicar la
 * explicación y el aviso de publicación en cada una.
 */
export function LegalTabs({ canWrite }: { canWrite: boolean }) {
  return (
    <Tabs defaultValue={LEGAL_DOCS[0]}>
      <TabsList>
        {LEGAL_DOCS.map((doc) => {
          const Icon = DOC_ICONS[doc];
          return (
            <TabsTrigger key={doc} value={doc}>
              <Icon />
              {DOC_LABELS[doc]}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {LEGAL_DOCS.map((doc) => (
        <TabsContent key={doc} value={doc} className="pt-4">
          <LegalEditor doc={doc} canWrite={canWrite} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
