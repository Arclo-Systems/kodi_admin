'use client';

import { GlobeIcon, SmartphoneIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminRole } from '@/lib/auth';
import { VersionsTab } from './versions-tab';
import { CountriesTab } from './countries-tab';

export function LaunchesTabs({ role, isGlobalScope }: { role: AdminRole; isGlobalScope: boolean }) {
  return (
    <Tabs defaultValue="versions">
      <TabsList>
        <TabsTrigger value="versions">
          <SmartphoneIcon />
          Versiones
        </TabsTrigger>
        <TabsTrigger value="countries">
          <GlobeIcon />
          Países
        </TabsTrigger>
      </TabsList>
      <TabsContent value="versions" className="mt-4">
        <VersionsTab role={role} />
      </TabsContent>
      <TabsContent value="countries" className="mt-4">
        <CountriesTab role={role} isGlobalScope={isGlobalScope} />
      </TabsContent>
    </Tabs>
  );
}
