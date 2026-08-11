'use client';

import { ListIcon, TrophyIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickModesList } from '../quick-modes-list';
import { QuickModesRanking } from './quick-modes-ranking';

export function QuickModesTabs({ allowedCountries }: { allowedCountries: string[] }) {
  return (
    <Tabs defaultValue="sesiones">
      <TabsList>
        <TabsTrigger value="sesiones">
          <ListIcon />
          Sesiones
        </TabsTrigger>
        <TabsTrigger value="ranking">
          <TrophyIcon />
          Ranking
        </TabsTrigger>
      </TabsList>
      <TabsContent value="sesiones" className="mt-4">
        <QuickModesList />
      </TabsContent>
      <TabsContent value="ranking" className="mt-4">
        <QuickModesRanking allowedCountries={allowedCountries} />
      </TabsContent>
    </Tabs>
  );
}
