'use client';

import { BotIcon, ChartColumnIcon, ImagesIcon, LayersIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BotsTab } from './bots-tab';
import { TemplatesTab } from './templates-tab';
import { PoolsTab } from './pools-tab';
import { MetricsTab } from './metrics-tab';

export function BotsTabs({ canWrite }: { canWrite: boolean }) {
  return (
    <Tabs defaultValue="bots">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="bots">
            <BotIcon />
            Bots
          </TabsTrigger>
          <TabsTrigger value="templates">
            <LayersIcon />
            Plantillas
          </TabsTrigger>
          <TabsTrigger value="pools">
            <ImagesIcon />
            Pools
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <ChartColumnIcon />
            Métricas
          </TabsTrigger>
        </TabsList>
        {/* Slot donde el DataTable de Bots porta su barra (Generar bots + Columnas). */}
        <div id="bots-table-toolbar" className="flex items-center gap-2" />
      </div>
      <TabsContent value="bots" className="mt-4">
        <BotsTab canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="templates" className="mt-4">
        <TemplatesTab canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="pools" className="mt-4">
        <PoolsTab canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="metrics" className="mt-4">
        <MetricsTab />
      </TabsContent>
    </Tabs>
  );
}

export const COUNTRIES = ['CR', 'GT', 'SV', 'HN', 'PA', 'CL', 'MX', 'AR'];
